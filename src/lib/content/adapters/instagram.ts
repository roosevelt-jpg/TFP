import "server-only";

import { resolveSecret } from "@/lib/secrets/store";
import type {
  AdapterPostCard,
  PublishAdapter,
  PublishAdapterResult,
  VerifyAdapterResult,
} from "@/lib/content/adapters/types";

async function igCredentials() {
  const token =
    (await resolveSecret("META_PAGE_ACCESS_TOKEN")) ??
    (await resolveSecret("META_ACCESS_TOKEN")) ??
    process.env.META_PAGE_ACCESS_TOKEN ??
    process.env.META_ACCESS_TOKEN;
  const igUserId =
    (await resolveSecret("META_INSTAGRAM_ACCOUNT_ID")) ??
    process.env.META_INSTAGRAM_ACCOUNT_ID;
  return { token, igUserId };
}

function accountUrl(account: string) {
  return `https://www.instagram.com/${account.replace(/^@/, "")}/`;
}

function isVideoMime(mime: string | null | undefined) {
  return Boolean(mime && /^video\//i.test(mime));
}

async function waitForIgContainer(input: {
  creationId: string;
  token: string;
  attempts?: number;
}) {
  const attempts = input.attempts ?? 12;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${input.creationId}?fields=status_code,status&access_token=${encodeURIComponent(input.token)}`,
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Instagram container status failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as {
      status_code?: string;
      status?: string;
    };
    const code = (data.status_code ?? data.status ?? "").toUpperCase();
    if (code === "FINISHED" || code === "PUBLISHED") return;
    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error(`Instagram container ${code}: ${data.status ?? ""}`);
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error("Instagram container not ready in time");
}

async function publishInstagram(
  postCard: AdapterPostCard,
): Promise<PublishAdapterResult> {
  const { token, igUserId } = await igCredentials();
  const mediaUrl = postCard.coverUrl;
  const caption = postCard.caption ?? "";
  const video = isVideoMime(postCard.mimeType);

  if (!token || !igUserId) {
    return {
      url: accountUrl(postCard.account),
      published: false,
      error:
        "Instagram credentials missing (META_PAGE_ACCESS_TOKEN / META_INSTAGRAM_ACCOUNT_ID)",
    };
  }
  if (!mediaUrl) {
    return {
      url: accountUrl(postCard.account),
      published: false,
      error: "Instagram publish requires coverUrl / media URL",
    };
  }

  const containerBody = video
    ? {
        video_url: mediaUrl,
        // Reels for short-form video; VIDEO also accepted by Graph for feed clips.
        media_type: postCard.platform.toLowerCase().includes("video") && !postCard.platform.toLowerCase().includes("reel")
          ? "VIDEO"
          : "REELS",
        caption,
        access_token: token,
      }
    : {
        image_url: mediaUrl,
        caption,
        access_token: token,
      };

  const createRes = await fetch(
    `https://graph.facebook.com/v21.0/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
    },
  );
  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`Instagram media create failed: ${createRes.status} ${body}`);
  }
  const created = (await createRes.json()) as { id?: string };
  if (!created.id) throw new Error("Instagram media id missing");

  if (video) {
    await waitForIgContainer({ creationId: created.id, token });
  }

  const pubRes = await fetch(
    `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: created.id, access_token: token }),
    },
  );
  if (!pubRes.ok) {
    const body = await pubRes.text();
    throw new Error(`Instagram publish failed: ${pubRes.status} ${body}`);
  }
  const published = (await pubRes.json()) as { id?: string };
  const externalId = published.id ?? created.id;
  return {
    url: video
      ? `https://www.instagram.com/reel/${externalId}/`
      : `https://www.instagram.com/p/${externalId}/`,
    published: true,
    externalId,
  };
}

async function verifyInstagram(
  postCard: AdapterPostCard,
): Promise<VerifyAdapterResult> {
  const { token } = await igCredentials();
  if (!token) {
    return { ok: false, error: "Instagram token missing for verify" };
  }

  const mediaId =
    postCard.postUrl?.match(/\/p\/([^/]+)/)?.[1] ??
    postCard.postUrl?.match(/\/reel\/([^/]+)/)?.[1] ??
    postCard.postUrl?.match(/media_id=(\d+)/)?.[1];
  if (!mediaId) {
    return {
      ok: false,
      error: "Cannot verify Instagram post without media id in postUrl",
    };
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${mediaId}?fields=id,permalink&access_token=${encodeURIComponent(token)}`,
  );
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `Instagram verify failed: ${res.status} ${body}` };
  }
  const data = (await res.json()) as { id?: string; permalink?: string };
  return {
    ok: Boolean(data.id),
    url: data.permalink ?? postCard.postUrl ?? undefined,
  };
}

export const instagramAdapter: PublishAdapter = {
  platform: "instagram",
  publish: publishInstagram,
  verify: verifyInstagram,
};
