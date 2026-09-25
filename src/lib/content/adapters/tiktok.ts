import "server-only";

import { resolveSecret } from "@/lib/secrets/store";
import { logger } from "@/lib/logger";
import type {
  AdapterPostCard,
  PublishAdapter,
  PublishAdapterResult,
  VerifyAdapterResult,
} from "@/lib/content/adapters/types";

async function tiktokToken() {
  return (
    (await resolveSecret("TIKTOK_ACCESS_TOKEN")) ??
    process.env.TIKTOK_ACCESS_TOKEN
  );
}

function accountUrl(account: string) {
  return `https://www.tiktok.com/@${account.replace(/^@/, "")}`;
}

/**
 * Best-effort Content Posting API (Direct Post / PULL_FROM_URL).
 * Until TikTok audits the app, posts must stay SELF_ONLY / private.
 */
async function publishTikTok(
  postCard: AdapterPostCard,
): Promise<PublishAdapterResult> {
  const token = await tiktokToken();
  const caption = (postCard.caption ?? "").slice(0, 2200);
  const fallback = accountUrl(postCard.account);

  if (!token) {
    return {
      url: fallback,
      published: false,
      error: "TIKTOK_ACCESS_TOKEN missing — cannot publish",
    };
  }

  if (!postCard.coverUrl) {
    return {
      url: fallback,
      published: false,
      error:
        "TikTok audit pending / media URL missing — scheduled private until audit",
    };
  }

  try {
    const res = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title: caption || "TFP post",
            privacy_level: "SELF_ONLY",
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: postCard.coverUrl,
          },
        }),
      },
    );
    const body = (await res.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string };
      data?: { publish_id?: string; share_id?: string };
    };

    if (!res.ok || body.error?.code) {
      const msg =
        body.error?.message ??
        `TikTok publish HTTP ${res.status} — audit may still be pending`;
      logger.info("TikTok publish best-effort failed; keeping private", {
        status: res.status,
        error: msg,
      });
      return {
        url: fallback,
        published: false,
        error: msg,
      };
    }

    const publishId = body.data?.publish_id ?? body.data?.share_id;
    return {
      url: publishId
        ? `${fallback}/video/${publishId}`
        : fallback,
      published: false,
      externalId: publishId,
      error:
        "TikTok post initiated as SELF_ONLY — live publish blocked until app audit",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "tiktok_http_error";
    return { url: fallback, published: false, error: msg };
  }
}

async function verifyTikTok(
  postCard: AdapterPostCard,
): Promise<VerifyAdapterResult> {
  const token = await tiktokToken();
  if (!token) {
    return { ok: false, error: "TIKTOK_ACCESS_TOKEN missing" };
  }

  const publishId =
    postCard.postUrl?.match(/\/video\/([^/?#]+)/)?.[1] ?? undefined;
  if (!publishId) {
    return {
      ok: false,
      error: "TikTok verify needs publish_id in postUrl (audit / inbox pending)",
    };
  }

  try {
    const res = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({ publish_id: publishId }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `TikTok verify failed: ${res.status} ${text}` };
    }
    const data = (await res.json()) as {
      data?: { status?: string };
    };
    const status = data.data?.status?.toLowerCase() ?? "";
    const ok =
      status.includes("publish_complete") ||
      status.includes("published") ||
      status === "success";
    return {
      ok,
      url: postCard.postUrl ?? undefined,
      error: ok ? undefined : `TikTok status: ${status || "unknown"}`,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "tiktok_verify_error",
    };
  }
}

export const tiktokAdapter: PublishAdapter = {
  platform: "tiktok",
  publish: publishTikTok,
  verify: verifyTikTok,
};
