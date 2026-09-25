"use server";

import { revalidatePath } from "next/cache";

import * as z from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { LANDING_CMS_FIELDS } from "@/lib/cms/landing-catalog";
import {
  plainTextJsonStrings,
  stripHtmlToPlainText,
} from "@/lib/cms/plain-text";
import { upsertCmsValue } from "@/lib/cms/store";
import { uploadEmailLogo } from "@/lib/mail/logo";
import { actionClient } from "@/lib/safe-action";

const saveSchema = z.object({
  namespace: z.enum(["landing", "admin", "brand"]),
  key: z.string().min(1).max(200),
  value: z.string().max(100_000),
});

function normalizeCmsValue(key: string, value: string) {
  const field = LANDING_CMS_FIELDS.find((f) => f.key === key);
  const kind = field?.kind ?? "text";
  if (kind === "image" || kind === "toggle") return value.trim();
  if (kind === "json") return plainTextJsonStrings(value);
  return stripHtmlToPlainText(value);
}

export const saveCmsFieldAction = actionClient
  .metadata({ actionName: "admin.saveCmsField" })
  .inputSchema(saveSchema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "lemoni"]);
    const value = normalizeCmsValue(parsedInput.key, parsedInput.value);
    await upsertCmsValue({
      namespace: parsedInput.namespace,
      key: parsedInput.key,
      value,
      updatedBy: session.user.email,
    });
    revalidatePath("/");
    revalidatePath("/admin/cms");
    return { ok: true as const };
  });

/** Direct Blob URL from client multipart upload — no base64 through the action. */
const mediaSchema = z.object({
  key: z.string().min(1).max(200),
  mediaUrl: z.string().url(),
  contentType: z
    .string()
    .regex(/^image\/(png|jpeg|jpg|webp|svg\+xml)$/i, "Image only"),
});

export const uploadCmsMediaAction = actionClient
  .metadata({ actionName: "admin.uploadCmsMedia" })
  .inputSchema(mediaSchema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "lemoni"]);

    await upsertCmsValue({
      namespace: "landing",
      key: parsedInput.key,
      value: parsedInput.mediaUrl,
      updatedBy: session.user.email,
    });

    // Email logo: fetch the Blob once and store as private CID asset.
    if (parsedInput.key === "brand.emailLogo") {
      if (!/^image\/(png|jpeg|jpg|webp)$/i.test(parsedInput.contentType)) {
        throw new Error("Email logo must be PNG, JPEG, or WebP");
      }
      const res = await fetch(parsedInput.mediaUrl);
      if (!res.ok) {
        throw new Error(`Could not fetch uploaded logo (${res.status})`);
      }
      const bytes = Buffer.from(await res.arrayBuffer());
      await uploadEmailLogo(bytes, parsedInput.contentType.toLowerCase());
      revalidatePath("/admin/integrations");
    }

    revalidatePath("/");
    revalidatePath("/admin/cms");
    return { ok: true as const, url: parsedInput.mediaUrl };
  });
