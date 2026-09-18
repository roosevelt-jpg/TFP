"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/auth/session";
import { db } from "@/db";
import { actionClient } from "@/lib/safe-action";
import {
  isWhatsAppTemplateKey,
  WHATSAPP_TEMPLATE_KEYS,
} from "@/lib/whatsapp/templates-keys";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_CODES,
} from "@/lib/i18n/catalog";

const keySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_]+$/i, "Key: letters, numbers, underscores only");

const metaNameSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9_]+$/i, "Meta name: letters, numbers, underscores only");

const saveSchema = z.object({
  channel: z.enum(["whatsapp", "instagram"]).default("whatsapp"),
  key: keySchema,
  label: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  metaName: metaNameSchema,
  language: z.enum(LANGUAGE_CODES).default(DEFAULT_LANGUAGE),
  bodyText: z.string().max(4000).optional(),
  bodyVars: z.coerce.number().int().min(0).max(5),
  buttonUrlCount: z.coerce.number().int().min(0).max(3),
  headerMediaType: z.enum(["none", "image", "video", "document"]),
  headerMediaUrl: z.string().max(2000).optional(),
  category: z.enum(["utility", "lifecycle", "marketing", "authentication"]),
  triggerHint: z.string().max(200).optional(),
  enabled: z.boolean(),
});

export const saveWhatsAppTemplateAction = actionClient
  .metadata({ actionName: "admin.saveWhatsAppTemplate" })
  .inputSchema(saveSchema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "lemoni"]);
    const existing = await db.messageTemplate.findUnique({
      where: { key: parsedInput.key },
    });

    const mediaUrlRaw = parsedInput.headerMediaUrl?.trim() || null;
    if (
      mediaUrlRaw &&
      parsedInput.headerMediaType !== "none" &&
      !/^https:\/\//i.test(mediaUrlRaw)
    ) {
      return { ok: false as const, error: "Media URL must be https://" };
    }
    const mediaUrl =
      parsedInput.headerMediaType === "none" ? null : mediaUrlRaw;

    const bumped =
      existing &&
      (existing.metaName !== parsedInput.metaName ||
        existing.language !== parsedInput.language ||
        existing.bodyVars !== parsedInput.bodyVars ||
        existing.buttonUrlCount !== parsedInput.buttonUrlCount ||
        existing.bodyText !== (parsedInput.bodyText || null) ||
        existing.headerMediaType !== parsedInput.headerMediaType ||
        existing.headerMediaUrl !== mediaUrl);

    await db.messageTemplate.upsert({
      where: { key: parsedInput.key },
      create: {
        channel: parsedInput.channel,
        key: parsedInput.key,
        label: parsedInput.label,
        description: parsedInput.description || null,
        metaName: parsedInput.metaName,
        language: parsedInput.language,
        bodyText: parsedInput.bodyText || null,
        bodyVars: parsedInput.bodyVars,
        buttonUrlCount: parsedInput.buttonUrlCount,
        headerMediaType: parsedInput.headerMediaType,
        headerMediaUrl: mediaUrl,
        category: parsedInput.category,
        triggerHint: parsedInput.triggerHint || null,
        enabled: parsedInput.enabled,
        version: 1,
        updatedBy: session.user.email,
      },
      update: {
        channel: parsedInput.channel,
        label: parsedInput.label,
        description: parsedInput.description || null,
        metaName: parsedInput.metaName,
        language: parsedInput.language,
        bodyText: parsedInput.bodyText || null,
        bodyVars: parsedInput.bodyVars,
        buttonUrlCount: parsedInput.buttonUrlCount,
        headerMediaType: parsedInput.headerMediaType,
        headerMediaUrl: mediaUrl,
        category: parsedInput.category,
        triggerHint: parsedInput.triggerHint || null,
        enabled: parsedInput.enabled,
        version: bumped ? (existing?.version ?? 1) + 1 : existing?.version ?? 1,
        updatedBy: session.user.email,
      },
    });

    revalidatePath("/admin/growth/whatsapp");
    revalidatePath("/admin/growth/instagram");
    return { ok: true as const };
  });

export const createWhatsAppTemplateAction = actionClient
  .metadata({ actionName: "admin.createWhatsAppTemplate" })
  .inputSchema(saveSchema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "lemoni"]);

    const existing = await db.messageTemplate.findUnique({
      where: { key: parsedInput.key },
    });
    if (existing) {
      return { ok: false as const, error: "Template key already exists" };
    }

    const mediaUrlRaw = parsedInput.headerMediaUrl?.trim() || null;
    if (
      mediaUrlRaw &&
      parsedInput.headerMediaType !== "none" &&
      !/^https:\/\//i.test(mediaUrlRaw)
    ) {
      return { ok: false as const, error: "Media URL must be https://" };
    }
    const mediaUrl =
      parsedInput.headerMediaType === "none" ? null : mediaUrlRaw;

    await db.messageTemplate.create({
      data: {
        channel: parsedInput.channel,
        key: parsedInput.key,
        label: parsedInput.label,
        description: parsedInput.description || null,
        metaName: parsedInput.metaName,
        language: parsedInput.language,
        bodyText: parsedInput.bodyText || null,
        bodyVars: parsedInput.bodyVars,
        buttonUrlCount: parsedInput.buttonUrlCount,
        headerMediaType: parsedInput.headerMediaType,
        headerMediaUrl: mediaUrl,
        category: parsedInput.category,
        triggerHint: parsedInput.triggerHint || null,
        enabled: parsedInput.enabled,
        version: 1,
        updatedBy: session.user.email,
      },
    });

    revalidatePath("/admin/growth/whatsapp");
    revalidatePath("/admin/growth/instagram");
    return { ok: true as const };
  });

export const deleteWhatsAppTemplateAction = actionClient
  .metadata({ actionName: "admin.deleteWhatsAppTemplate" })
  .inputSchema(z.object({ key: keySchema }))
  .action(async ({ parsedInput }) => {
    await requireAdminSession(["kane", "lemoni"]);

    if (isWhatsAppTemplateKey(parsedInput.key)) {
      return {
        ok: false as const,
        error: `Cannot delete wired key (${WHATSAPP_TEMPLATE_KEYS.join(", ")}). Disable it instead.`,
      };
    }
    if (
      parsedInput.key === "ig_inbound_ack" ||
      parsedInput.key === "ig_high_intent"
    ) {
      return {
        ok: false as const,
        error: "Cannot delete wired Instagram key. Disable it instead.",
      };
    }

    await db.messageTemplate.delete({ where: { key: parsedInput.key } });
    revalidatePath("/admin/growth/whatsapp");
    revalidatePath("/admin/growth/instagram");
    return { ok: true as const };
  });
