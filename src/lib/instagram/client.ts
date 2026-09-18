import "server-only";

import { env } from "@/env";
import { resolveSecret } from "@/lib/secrets/store";
import {
  getMetaTemplate,
  renderTemplateBody,
  type HeaderMediaType,
} from "@/lib/whatsapp/templates";
import { logger } from "@/lib/logger";

export type InstagramSendResult =
  | { ok: true; messageId?: string }
  | { ok: false; reason: string; detail?: string };

async function pageAccessToken() {
  return (
    (await resolveSecret("META_PAGE_ACCESS_TOKEN")) ??
    env.META_PAGE_ACCESS_TOKEN ??
    null
  );
}

/**
 * Send an admin-managed Instagram DM template (text + optional image/video).
 */
export async function sendInstagramTemplate(input: {
  recipientId: string;
  templateKey: string;
  bodyParams?: string[];
}): Promise<InstagramSendResult> {
  const token = await pageAccessToken();
  if (!token) return { ok: false, reason: "no_credentials" };

  const template = await getMetaTemplate(input.templateKey);
  if (!template.enabled || template.channel !== "instagram") {
    return { ok: false, reason: "template_disabled" };
  }

  const text = renderTemplateBody(
    template.bodyText ?? "",
    input.bodyParams ?? [],
  ).slice(0, 2000);

  if (template.headerMediaType !== "none" && template.headerMediaUrl) {
    const media = await sendInstagramMedia({
      recipientId: input.recipientId,
      mediaType: template.headerMediaType,
      mediaUrl: template.headerMediaUrl,
      token,
    });
    if (!media.ok) return media;
  }

  if (!text.trim()) {
    return { ok: true };
  }

  return sendInstagramText({
    recipientId: input.recipientId,
    text,
    token,
  });
}

export async function sendInstagramText(input: {
  recipientId: string;
  text: string;
  token?: string;
}): Promise<InstagramSendResult> {
  const token = input.token ?? (await pageAccessToken());
  if (!token) return { ok: false, reason: "no_credentials" };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${token}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipient: { id: input.recipientId },
          message: { text: input.text.slice(0, 2000) },
        }),
      },
    );
    const json = (await res.json()) as {
      message_id?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      return {
        ok: false,
        reason: "api_error",
        detail: json.error?.message ?? `http_${res.status}`,
      };
    }
    return { ok: true, messageId: json.message_id };
  } catch (error) {
    logger.warn("Instagram text send failed", {
      message: error instanceof Error ? error.message : "failed",
    });
    return { ok: false, reason: "network_error" };
  }
}

export async function sendInstagramMedia(input: {
  recipientId: string;
  mediaType: Exclude<HeaderMediaType, "none">;
  mediaUrl: string;
  token?: string;
}): Promise<InstagramSendResult> {
  const token = input.token ?? (await pageAccessToken());
  if (!token) return { ok: false, reason: "no_credentials" };
  if (!/^https:\/\//i.test(input.mediaUrl)) {
    return { ok: false, reason: "invalid_media_url" };
  }

  const attachmentType =
    input.mediaType === "video"
      ? "video"
      : input.mediaType === "document"
        ? "file"
        : "image";

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${token}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipient: { id: input.recipientId },
          message: {
            attachment: {
              type: attachmentType,
              payload: {
                url: input.mediaUrl,
                is_reusable: true,
              },
            },
          },
        }),
      },
    );
    const json = (await res.json()) as {
      message_id?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      return {
        ok: false,
        reason: "api_error",
        detail: json.error?.message ?? `http_${res.status}`,
      };
    }
    return { ok: true, messageId: json.message_id };
  } catch (error) {
    logger.warn("Instagram media send failed", {
      message: error instanceof Error ? error.message : "failed",
    });
    return { ok: false, reason: "network_error" };
  }
}
