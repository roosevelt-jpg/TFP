import "server-only";

import { resolveSecret } from "@/lib/secrets/store";
import { extractComplianceTextFromMeta } from "@/lib/content/compliance";
import { logger } from "@/lib/logger";

export type ComplianceEnrichment = {
  ocr?: string;
  transcript?: string;
  onScreenText?: string;
  source: "gemini" | "frame" | "pending" | "none";
};

/** Only when there is truly no key and/or no media to run ASR against. */
const VIDEO_ASR_PENDING = "video ASR pending — caption-only check";

const FRAME_TRANSCRIPT_NOTE =
  "Frame transcript path: set custom metadata `transcript` / `asr` / `captions` on the Frame.io asset (or wait for Gemini ASR retry)";

function isImageMime(mime: string | null | undefined) {
  return Boolean(mime && /^image\//i.test(mime));
}

function isVideoMime(mime: string | null | undefined) {
  return Boolean(mime && /^video\//i.test(mime));
}

function guessMimeFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (/\.(png)(\?|$)/.test(lower)) return "image/png";
  if (/\.(webp)(\?|$)/.test(lower)) return "image/webp";
  if (/\.(gif)(\?|$)/.test(lower)) return "image/gif";
  if (/\.(mp4|mov|webm)(\?|$)/.test(lower)) return "video/mp4";
  return "image/jpeg";
}

function geminiTextFromResponse(json: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}): string | null {
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text || null;
}

async function fetchInlineImagePart(mediaUrl: string, mimeType: string) {
  const res = await fetch(mediaUrl);
  if (!res.ok) {
    throw new Error(`Media fetch failed: ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > 12 * 1024 * 1024) {
    throw new Error("Image too large for Gemini OCR");
  }
  return {
    inlineData: {
      mimeType,
      data: buf.toString("base64"),
    },
  };
}

/**
 * Upload video bytes to Gemini Files API, return fileUri for generateContent.
 * Falls back to null on failure so caller can try fileUri / Frame note.
 */
async function uploadGeminiFile(input: {
  mediaUrl: string;
  mimeType: string;
  apiKey: string;
}): Promise<string | null> {
  const mediaRes = await fetch(input.mediaUrl);
  if (!mediaRes.ok) {
    logger.warn("Gemini video fetch failed", { status: mediaRes.status });
    return null;
  }
  const buf = Buffer.from(await mediaRes.arrayBuffer());
  // Gemini inline/file soft limit — skip huge masters; prefer Frame tags.
  if (buf.byteLength > 80 * 1024 * 1024) {
    logger.info("Video too large for Gemini Files upload; prefer Frame transcript");
    return null;
  }

  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(input.apiKey)}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(buf.byteLength),
        "X-Goog-Upload-Header-Content-Type": input.mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: { display_name: "tfp-compliance-asr" },
      }),
    },
  );
  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!startRes.ok || !uploadUrl) {
    logger.warn("Gemini Files upload start failed", {
      status: startRes.status,
    });
    return null;
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(buf.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: buf,
  });
  if (!uploadRes.ok) {
    logger.warn("Gemini Files upload finalize failed", {
      status: uploadRes.status,
    });
    return null;
  }

  const fileJson = (await uploadRes.json()) as {
    file?: { uri?: string; name?: string };
    uri?: string;
  };
  return fileJson.file?.uri ?? fileJson.uri ?? null;
}

async function geminiGenerateWithParts(input: {
  apiKey: string;
  model: string;
  parts: unknown[];
}): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": input.apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: input.parts }],
        generationConfig: { maxOutputTokens: 4096 },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    logger.warn("Gemini generateContent failed", {
      status: res.status,
      body: body.slice(0, 240),
    });
    return null;
  }

  return geminiTextFromResponse(
    (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    },
  );
}

async function geminiOcrFromImage(input: {
  mediaUrl: string;
  mimeType: string;
  apiKey: string;
  model: string;
}): Promise<string | null> {
  const imagePart = await fetchInlineImagePart(input.mediaUrl, input.mimeType);
  const prompt = `Extract all on-screen / burned-in text from this image for compliance review.
Return plain text only. Use approximate timestamp line markers like [0:00] before each distinct text region or line.
For a still image use [0:00]. Do not invent claims that are not visible.`;

  return geminiGenerateWithParts({
    apiKey: input.apiKey,
    model: input.model,
    parts: [{ text: prompt }, imagePart],
  });
}

/**
 * Video ASR via Gemini: prefer Files API upload, else fileData.fileUri on the
 * public mediaUrl. On failure, note the Frame transcript metadata path.
 */
async function geminiAsrFromVideo(input: {
  mediaUrl: string;
  mimeType: string;
  apiKey: string;
  model: string;
}): Promise<{ transcript: string; source: "gemini" | "pending" }> {
  const prompt = `Transcribe this video for compliance review.
Return plain text only. Use approximate timestamp line markers like [0:12] before each spoken segment.
Also list any burned-in / on-screen text with the same [M:SS] markers.
Do not invent claims that are not spoken or visible.`;

  const uploadedUri = await uploadGeminiFile({
    mediaUrl: input.mediaUrl,
    mimeType: input.mimeType,
    apiKey: input.apiKey,
  });

  if (uploadedUri) {
    const text = await geminiGenerateWithParts({
      apiKey: input.apiKey,
      model: input.model,
      parts: [
        { text: prompt },
        {
          fileData: {
            mimeType: input.mimeType,
            fileUri: uploadedUri,
          },
        },
      ],
    });
    if (text) return { transcript: text, source: "gemini" };
  }

  // Public HTTPS URI path (works for some Blob / CDN URLs Gemini can fetch).
  const viaUri = await geminiGenerateWithParts({
    apiKey: input.apiKey,
    model: input.model,
    parts: [
      { text: prompt },
      {
        fileData: {
          mimeType: input.mimeType,
          fileUri: input.mediaUrl,
        },
      },
    ],
  });
  if (viaUri) return { transcript: viaUri, source: "gemini" };

  return {
    transcript: `${FRAME_TRANSCRIPT_NOTE} · mediaUrl present, Gemini ASR failed`,
    source: "pending",
  };
}

/**
 * Enrich compliance text from media when GEMINI_API_KEY is set.
 * Images → Gemini multimodal OCR with [M:SS] line markers.
 * Video → Frame tags transcript if present, else Gemini ASR when key+mediaUrl,
 * else VIDEO_ASR_PENDING only when key or media is missing.
 */
export async function enrichComplianceFromMedia(input: {
  mediaUrl: string | null | undefined;
  mimeType?: string | null;
  existingTags?: unknown;
  caption?: string | null;
}): Promise<ComplianceEnrichment> {
  const fromMeta = extractComplianceTextFromMeta(input.existingTags);
  const hasTranscript = Boolean(fromMeta.transcript);
  const hasOcr = Boolean(fromMeta.onScreenText);
  const mime =
    input.mimeType ??
    (input.mediaUrl ? guessMimeFromUrl(input.mediaUrl) : null);

  if (isVideoMime(mime) && hasTranscript) {
    return {
      transcript: fromMeta.transcript,
      ocr: fromMeta.onScreenText,
      onScreenText: fromMeta.onScreenText,
      source: "frame",
    };
  }

  if (hasOcr && hasTranscript) {
    return {
      ocr: fromMeta.onScreenText,
      onScreenText: fromMeta.onScreenText,
      transcript: fromMeta.transcript,
      source: "frame",
    };
  }

  if (!input.mediaUrl) {
    if (isVideoMime(mime) && !hasTranscript) {
      return {
        transcript: VIDEO_ASR_PENDING,
        ocr: fromMeta.onScreenText,
        onScreenText: fromMeta.onScreenText,
        source: "pending",
      };
    }
    return {
      ocr: fromMeta.onScreenText,
      transcript: fromMeta.transcript,
      onScreenText: fromMeta.onScreenText,
      source: fromMeta.onScreenText || fromMeta.transcript ? "frame" : "none",
    };
  }

  const apiKey =
    (await resolveSecret("GEMINI_API_KEY")) ?? process.env.GEMINI_API_KEY;

  const model =
    (await resolveSecret("GEMINI_MODEL")) ??
    process.env.GEMINI_MODEL ??
    "gemini-2.5-flash";

  if (isVideoMime(mime) && !hasTranscript) {
    if (!apiKey) {
      return {
        transcript: VIDEO_ASR_PENDING,
        ocr: fromMeta.onScreenText,
        onScreenText: fromMeta.onScreenText,
        source: "pending",
      };
    }

    try {
      const asr = await geminiAsrFromVideo({
        mediaUrl: input.mediaUrl,
        mimeType: mime ?? "video/mp4",
        apiKey,
        model,
      });
      return {
        transcript: asr.transcript,
        ocr: fromMeta.onScreenText,
        onScreenText: fromMeta.onScreenText,
        source: asr.source,
      };
    } catch (error) {
      logger.warn("Compliance video ASR failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
      return {
        transcript: `${FRAME_TRANSCRIPT_NOTE} · Gemini ASR error`,
        ocr: fromMeta.onScreenText,
        onScreenText: fromMeta.onScreenText,
        source: "pending",
      };
    }
  }

  if (!apiKey) {
    return {
      ocr: fromMeta.onScreenText,
      transcript: fromMeta.transcript,
      onScreenText: fromMeta.onScreenText,
      source: fromMeta.onScreenText || fromMeta.transcript ? "frame" : "none",
    };
  }

  if (isImageMime(mime) && !hasOcr) {
    try {
      const ocr = await geminiOcrFromImage({
        mediaUrl: input.mediaUrl,
        mimeType: mime ?? "image/jpeg",
        apiKey,
        model,
      });
      if (ocr) {
        return {
          ocr,
          onScreenText: ocr,
          transcript: fromMeta.transcript,
          source: "gemini",
        };
      }
    } catch (error) {
      logger.warn("Compliance image enrichment failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return {
    ocr: fromMeta.onScreenText,
    transcript: fromMeta.transcript,
    onScreenText: fromMeta.onScreenText,
    source: fromMeta.onScreenText || fromMeta.transcript ? "frame" : "none",
  };
}

/** Merge enrichment into a ContentAsset.tags bag. */
export function mergeComplianceEnrichment(
  existing: unknown,
  enrichment: ComplianceEnrichment,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  if (enrichment.ocr) {
    base.ocr = enrichment.ocr;
    base.onScreenText = enrichment.onScreenText ?? enrichment.ocr;
  }
  if (enrichment.transcript) {
    base.transcript = enrichment.transcript;
  }
  if (enrichment.source !== "none") {
    base.complianceEnrichSource = enrichment.source;
  }
  return base;
}
