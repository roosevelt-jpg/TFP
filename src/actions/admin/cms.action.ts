"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

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

const mediaSchema = z.object({
  key: z.string().min(1).max(200),
  dataBase64: z.string().min(32),
  contentType: z
    .string()
    .regex(/^image\/(png|jpeg|jpg|webp|svg\+xml)$/i, "Image only"),
  fileName: z.string().min(1).max(120).optional(),
});

export const uploadCmsMediaAction = actionClient
  .metadata({ actionName: "admin.uploadCmsMedia" })
  .inputSchema(mediaSchema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "lemoni"]);
    const bytes = Buffer.from(parsedInput.dataBase64, "base64");
    if (bytes.byteLength < 32 || bytes.byteLength > 4_000_000) {
      throw new Error("Image must be between 32B and 4MB");
    }

    const ext = parsedInput.contentType.includes("svg")
      ? "svg"
      : parsedInput.contentType.includes("png")
        ? "png"
        : parsedInput.contentType.includes("webp")
          ? "webp"
          : "jpg";

    const safeKey = parsedInput.key.replace(/[^a-zA-Z0-9._-]/g, "-");
    const dir = path.join(process.cwd(), "public", "uploads", "cms");
    await mkdir(dir, { recursive: true });
    const fileName = `${safeKey}-${Date.now()}.${ext}`;
    await writeFile(path.join(dir, fileName), bytes);
    const url = `/uploads/cms/${fileName}`;

    await upsertCmsValue({
      namespace: "landing",
      key: parsedInput.key,
      value: url,
      updatedBy: session.user.email,
    });

    // Email logo also feeds the CID attachment used by every branded email.
    if (parsedInput.key === "brand.emailLogo") {
      if (!/^image\/(png|jpeg|jpg|webp)$/i.test(parsedInput.contentType)) {
        throw new Error("Email logo must be PNG, JPEG, or WebP");
      }
      await uploadEmailLogo(bytes, parsedInput.contentType.toLowerCase());
      revalidatePath("/admin/integrations");
    }

    revalidatePath("/");
    revalidatePath("/admin/cms");
    return { ok: true as const, url };
  });
