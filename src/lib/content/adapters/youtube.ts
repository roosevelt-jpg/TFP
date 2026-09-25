import "server-only";

import { resolveSecret } from "@/lib/secrets/store";
import { logger } from "@/lib/logger";
import type {
  AdapterPostCard,
  PublishAdapter,
  PublishAdapterResult,
  VerifyAdapterResult,
} from "@/lib/content/adapters/types";

async function youtubeToken() {
  return (
    (await resolveSecret("YOUTUBE_ACCESS_TOKEN")) ??
    process.env.YOUTUBE_ACCESS_TOKEN
  );
}

function channelUrl(account: string) {
  return `https://www.youtube.com/@${account.replace(/^@/, "")}`;
}

/**
 * Best-effort YouTube Data API v3 resumable upload (private until Google audit).
 */
async function publishYouTube(
  postCard: AdapterPostCard,
): Promise<PublishAdapterResult> {
  const token = await youtubeToken();
  const caption = postCard.caption ?? "";
  const fallback = channelUrl(postCard.account);

  if (!token) {
    return {
      url: fallback,
      published: false,
      error: "YOUTUBE_ACCESS_TOKEN missing — cannot publish",
    };
  }

  if (!postCard.coverUrl) {
    return {
      url: fallback,
      published: false,
      error:
        "YouTube audit pending / media URL missing — scheduled private until audit",
    };
  }

  try {
    const mediaRes = await fetch(postCard.coverUrl);
    if (!mediaRes.ok) {
      return {
        url: fallback,
        published: false,
        error: `Could not fetch media for YouTube upload: ${mediaRes.status}`,
      };
    }
    const mediaBytes = await mediaRes.arrayBuffer();
    const contentType =
      mediaRes.headers.get("content-type") ?? "video/mp4";

    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": contentType,
          "X-Upload-Content-Length": String(mediaBytes.byteLength),
        },
        body: JSON.stringify({
          snippet: {
            title: caption.slice(0, 100) || "TFP Short",
            description: caption.slice(0, 5000),
            categoryId: "22",
          },
          status: {
            // Unverified / pre-audit projects must stay private.
            privacyStatus: "private",
            selfDeclaredMadeForKids: false,
          },
        }),
      },
    );

    if (!initRes.ok) {
      const body = await initRes.text();
      const msg = `YouTube upload init failed: ${initRes.status} ${body}`;
      logger.info("YouTube publish best-effort failed; keeping private", {
        status: initRes.status,
      });
      return {
        url: fallback,
        published: false,
        error: msg.includes("audit")
          ? msg
          : `${msg} — project may still be pending Google audit`,
      };
    }

    const uploadUrl = initRes.headers.get("location");
    if (!uploadUrl) {
      return {
        url: fallback,
        published: false,
        error: "YouTube resumable upload URL missing — audit / quota pending",
      };
    }

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType,
        "Content-Length": String(mediaBytes.byteLength),
      },
      body: mediaBytes,
    });

    if (!uploadRes.ok) {
      const body = await uploadRes.text();
      return {
        url: fallback,
        published: false,
        error: `YouTube upload failed: ${uploadRes.status} ${body}`,
      };
    }

    const uploaded = (await uploadRes.json()) as {
      id?: string;
      status?: { privacyStatus?: string };
    };
    const videoId = uploaded.id;
    return {
      url: videoId
        ? `https://www.youtube.com/watch?v=${videoId}`
        : fallback,
      // Stay unpublished publicly until audit + Kane-facing verify.
      published: false,
      externalId: videoId,
      error:
        uploaded.status?.privacyStatus === "private"
          ? "YouTube upload private until Google audit passes"
          : "YouTube upload completed but held private until audit",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "youtube_http_error";
    return { url: fallback, published: false, error: msg };
  }
}

async function verifyYouTube(
  postCard: AdapterPostCard,
): Promise<VerifyAdapterResult> {
  const token = await youtubeToken();
  if (!token) {
    return { ok: false, error: "YOUTUBE_ACCESS_TOKEN missing" };
  }

  const videoId =
    postCard.postUrl?.match(/[?&]v=([^&]+)/)?.[1] ??
    postCard.postUrl?.match(/youtu\.be\/([^/?#]+)/)?.[1];
  if (!videoId) {
    return {
      ok: false,
      error: "YouTube verify needs video id in postUrl",
    };
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=id,status,snippet&id=${encodeURIComponent(videoId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `YouTube verify failed: ${res.status} ${text}` };
    }
    const data = (await res.json()) as {
      items?: Array<{ id?: string; status?: { privacyStatus?: string } }>;
    };
    const item = data.items?.[0];
    if (!item?.id) {
      return { ok: false, error: "YouTube video not found on read-back" };
    }
    return {
      ok: true,
      url: `https://www.youtube.com/watch?v=${item.id}`,
      error:
        item.status?.privacyStatus === "private"
          ? "Video exists but is still private (audit / manual)"
          : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "youtube_verify_error",
    };
  }
}

export const youtubeAdapter: PublishAdapter = {
  platform: "youtube",
  publish: publishYouTube,
  verify: verifyYouTube,
};
