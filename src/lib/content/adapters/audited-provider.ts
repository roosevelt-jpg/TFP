import "server-only";

import { resolveSecret } from "@/lib/secrets/store";
import { logger } from "@/lib/logger";
import type {
  AdapterPostCard,
  PublishAdapter,
  PublishAdapterResult,
  VerifyAdapterResult,
} from "@/lib/content/adapters/types";

/**
 * Spec Part 07 §8: until Meta/TikTok/YouTube audits complete, publish through
 * an audited third-party provider Kane chooses. Direct adapters stay available
 * after audit; this adapter activates when CONTENT_PUBLISH_PROVIDER_URL is set.
 */
async function publishViaProvider(
  postCard: AdapterPostCard,
): Promise<PublishAdapterResult> {
  const baseUrl = await resolveSecret("CONTENT_PUBLISH_PROVIDER_URL");
  const token = await resolveSecret("CONTENT_PUBLISH_PROVIDER_TOKEN");

  if (!baseUrl) {
    return {
      url: "",
      published: false,
      error:
        "Audited publish provider unset — paste CONTENT_PUBLISH_PROVIDER_URL under Integrations, or use direct adapters after platform audit",
    };
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/publish`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        platform: postCard.platform,
        account: postCard.account,
        caption: postCard.caption,
        mediaUrl: postCard.coverUrl,
        postCardId: postCard.id,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      url?: string;
      published?: boolean;
      error?: string;
      externalId?: string;
    };
    if (!res.ok) {
      return {
        url: json.url ?? "",
        published: false,
        error: json.error ?? `Provider HTTP ${res.status}`,
      };
    }
    return {
      url: json.url ?? "",
      published: Boolean(json.published),
      externalId: json.externalId,
      error: json.error,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "provider_error";
    logger.warn("Audited publish provider failed", { message: msg });
    return { url: "", published: false, error: msg };
  }
}

async function verifyViaProvider(
  postCard: AdapterPostCard,
): Promise<VerifyAdapterResult> {
  const baseUrl = await resolveSecret("CONTENT_PUBLISH_PROVIDER_URL");
  const token = await resolveSecret("CONTENT_PUBLISH_PROVIDER_TOKEN");
  if (!baseUrl) {
    return { ok: false, error: "CONTENT_PUBLISH_PROVIDER_URL missing" };
  }
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/verify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        platform: postCard.platform,
        postUrl: postCard.postUrl,
        postCardId: postCard.id,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      url?: string;
      error?: string;
    };
    return {
      ok: Boolean(json.ok),
      url: json.url,
      error: json.error,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "provider_verify_error",
    };
  }
}

export const auditedProviderAdapter: PublishAdapter = {
  platform: "audited_provider",
  publish: publishViaProvider,
  verify: verifyViaProvider,
};

/** True when Kane has configured the interim audited publish provider. */
export async function useAuditedPublishProvider(): Promise<boolean> {
  const url = await resolveSecret("CONTENT_PUBLISH_PROVIDER_URL");
  return Boolean(url);
}
