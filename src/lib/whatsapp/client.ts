import "server-only";

import { logger } from "@/lib/logger";
import { db } from "@/db";
import {
  resolveWhatsAppCredentials,
  whatsappWorkflowsEnabled,
} from "@/lib/whatsapp/config";
import {
  getWhatsAppTemplate,
  type HeaderMediaType,
} from "@/lib/whatsapp/templates";

export type WhatsAppSendResult =
  | { ok: true; messageId: string; templateVersion: number; metaName: string }
  | { ok: false; reason: string; detail?: string };

function digitsOnly(e164: string) {
  return e164.replace(/\D/g, "");
}

async function alertTemplateRejection(input: {
  templateKey: string;
  detail: string;
  code?: number;
}) {
  try {
    await db.alert.create({
      data: {
        ruleId: "whatsapp_template_rejected",
        severity: "p2",
        title: `WhatsApp template failed: ${input.templateKey}`,
        payload: {
          templateKey: input.templateKey,
          detail: input.detail.slice(0, 500),
          code: input.code ?? null,
          source: "whatsapp_cloud_api",
        },
      },
    });
  } catch {
    // Never block the send path on alert write failures.
  }
}

function headerComponent(input: {
  mediaType: HeaderMediaType;
  mediaUrl: string | null;
}): Record<string, unknown> | null {
  if (
    input.mediaType === "none" ||
    !input.mediaUrl ||
    !/^https:\/\//i.test(input.mediaUrl)
  ) {
    return null;
  }
  if (input.mediaType === "image") {
    return {
      type: "header",
      parameters: [{ type: "image", image: { link: input.mediaUrl } }],
    };
  }
  if (input.mediaType === "video") {
    return {
      type: "header",
      parameters: [{ type: "video", video: { link: input.mediaUrl } }],
    };
  }
  if (input.mediaType === "document") {
    return {
      type: "header",
      parameters: [{ type: "document", document: { link: input.mediaUrl } }],
    };
  }
  return null;
}

/**
 * Send an approved template (outside the 24h window) via Cloud API.
 * Resolves name/language/media from admin MessageTemplate rows.
 */
export async function sendWhatsAppTemplate(input: {
  toE164: string;
  /** App key or any admin-managed MessageTemplate.key */
  templateKey: string;
  bodyParams?: string[];
  /** Dynamic URL button path/query suffixes (one per URL button on the template). */
  buttonUrlParams?: string[];
  /** Override header media URL for this send (must match template media type). */
  headerMediaUrl?: string;
}): Promise<WhatsAppSendResult> {
  if (!whatsappWorkflowsEnabled()) {
    return { ok: false, reason: "flag_off" };
  }

  const creds = await resolveWhatsAppCredentials();
  if (!creds) {
    return { ok: false, reason: "no_credentials" };
  }

  const template = await getWhatsAppTemplate(input.templateKey);
  if (!template.enabled) {
    return { ok: false, reason: "template_disabled" };
  }
  if (template.channel !== "whatsapp") {
    return { ok: false, reason: "wrong_channel" };
  }

  const params = (input.bodyParams ?? []).slice(
    0,
    Math.max(template.bodyVars, 0),
  );
  const components: Array<Record<string, unknown>> = [];

  const header = headerComponent({
    mediaType: template.headerMediaType,
    mediaUrl: input.headerMediaUrl ?? template.headerMediaUrl,
  });
  if (header) components.push(header);

  if (template.bodyVars > 0) {
    components.push({
      type: "body",
      parameters: params.map((text) => ({ type: "text", text })),
    });
  }

  const buttonParams = (input.buttonUrlParams ?? []).slice(
    0,
    Math.max(template.buttonUrlCount, 0),
  );
  buttonParams.forEach((text, index) => {
    components.push({
      type: "button",
      sub_type: "url",
      index: String(index),
      parameters: [{ type: "text", text }],
    });
  });

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${creds.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${creds.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: digitsOnly(input.toE164),
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language },
          ...(components.length > 0 ? { components } : {}),
        },
      }),
    },
  );

  const json = (await res.json()) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; code?: number; error_subcode?: number };
  };

  if (!res.ok) {
    const detail = json.error?.message ?? `http_${res.status}`;
    logger.warn("WhatsApp template send failed", {
      templateKey: input.templateKey,
      metaName: template.name,
      detail,
      code: json.error?.code,
    });
    if (
      json.error?.code === 132000 ||
      json.error?.code === 132001 ||
      json.error?.code === 132005 ||
      json.error?.code === 132007 ||
      json.error?.code === 132012 ||
      detail.toLowerCase().includes("template")
    ) {
      await alertTemplateRejection({
        templateKey: input.templateKey,
        detail: `${template.name}: ${detail}`,
        code: json.error?.code,
      });
    }
    return { ok: false, reason: "api_error", detail };
  }

  const messageId = json.messages?.[0]?.id;
  if (!messageId) {
    return { ok: false, reason: "no_message_id" };
  }
  return {
    ok: true,
    messageId,
    templateVersion: template.version,
    metaName: template.name,
  };
}

/** Free-form text — only valid inside the 24h service window. */
export async function sendWhatsAppText(input: {
  toE164: string;
  text: string;
}): Promise<WhatsAppSendResult> {
  if (!whatsappWorkflowsEnabled()) {
    return { ok: false, reason: "flag_off" };
  }

  const creds = await resolveWhatsAppCredentials();
  if (!creds) {
    return { ok: false, reason: "no_credentials" };
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${creds.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${creds.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: digitsOnly(input.toE164),
        type: "text",
        text: { body: input.text.slice(0, 4096) },
      }),
    },
  );

  const json = (await res.json()) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    return {
      ok: false,
      reason: "api_error",
      detail: json.error?.message ?? `http_${res.status}`,
    };
  }

  const messageId = json.messages?.[0]?.id;
  if (!messageId) return { ok: false, reason: "no_message_id" };
  return { ok: true, messageId, templateVersion: 0, metaName: "text" };
}

/**
 * Session-window media (image / video / document). Public HTTPS URL required.
 * Only valid inside the 24h customer-care window (or as template header).
 */
export async function sendWhatsAppMedia(input: {
  toE164: string;
  mediaType: Exclude<HeaderMediaType, "none">;
  mediaUrl: string;
  caption?: string;
}): Promise<WhatsAppSendResult> {
  if (!whatsappWorkflowsEnabled()) {
    return { ok: false, reason: "flag_off" };
  }
  if (!/^https:\/\//i.test(input.mediaUrl)) {
    return { ok: false, reason: "invalid_media_url" };
  }

  const creds = await resolveWhatsAppCredentials();
  if (!creds) {
    return { ok: false, reason: "no_credentials" };
  }

  const mediaPayload =
    input.mediaType === "image"
      ? {
          type: "image",
          image: {
            link: input.mediaUrl,
            ...(input.caption ? { caption: input.caption.slice(0, 1024) } : {}),
          },
        }
      : input.mediaType === "video"
        ? {
            type: "video",
            video: {
              link: input.mediaUrl,
              ...(input.caption
                ? { caption: input.caption.slice(0, 1024) }
                : {}),
            },
          }
        : {
            type: "document",
            document: {
              link: input.mediaUrl,
              ...(input.caption
                ? { caption: input.caption.slice(0, 1024) }
                : {}),
            },
          };

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${creds.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${creds.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: digitsOnly(input.toE164),
        ...mediaPayload,
      }),
    },
  );

  const json = (await res.json()) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    return {
      ok: false,
      reason: "api_error",
      detail: json.error?.message ?? `http_${res.status}`,
    };
  }

  const messageId = json.messages?.[0]?.id;
  if (!messageId) return { ok: false, reason: "no_message_id" };
  return {
    ok: true,
    messageId,
    templateVersion: 0,
    metaName: input.mediaType,
  };
}
