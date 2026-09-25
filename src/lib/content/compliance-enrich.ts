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

const VIDEO_ASR_PENDING = "video ASR pending — caption-only check";

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

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": input.apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }, imagePart],
          },
        ],
        generationConfig: { maxOutputTokens: 1200 },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    logger.warn("Gemini OCR failed", {
      status: res.status,
      body: body.slice(0, 200),
    });
    return null;
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text || null;
}

/**
 * Enrich compliance text from media when GEMINI_API_KEY is set.
 * Images → Gemini multimodal OCR with [M:SS] line markers.
 * Video → Frame tags transcript if present, else ASR-pending note.
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
    return { source: "none" };
  }

  const apiKey =
    (await resolveSecret("GEMINI_API_KEY")) ?? process.env.GEMINI_API_KEY;

  if (isVideoMime(mime) && !hasTranscript) {
    return {
      transcript: VIDEO_ASR_PENDING,
      ocr: fromMeta.onScreenText,
      onScreenText: fromMeta.onScreenText,
      source: "pending",
    };
  }

  if (!apiKey) {
    return {
      ocr: fromMeta.onScreenText,
      transcript: fromMeta.transcript,
      onScreenText: fromMeta.onScreenText,
      source: fromMeta.onScreenText || fromMeta.transcript ? "frame" : "none",
    };
  }

  const model =
    (await resolveSecret("GEMINI_MODEL")) ??
    process.env.GEMINI_MODEL ??
    "gemini-2.5-flash";

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