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

async function publishInstagram(
  postCard: AdapterPostCard,
): Promise<PublishAdapterResult> {
  const { token, igUserId } = await igCredentials();
  const mediaUrl = postCard.coverUrl;
  const caption = postCard.caption ?? "";

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

  const createRes = await fetch(
    `https://graph.facebook.com/v21.0/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: mediaUrl,
        caption,
        access_token: token,
      }),
    },
  );
  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`Instagram media create failed: ${createRes.status} ${body}`);
  }
  const created = (await createRes.json()) as { id?: string };
  if (!created.id) throw new Error("Instagram media id missing");

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
    url: `https://www.instagram.com/p/${externalId}/`,
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
