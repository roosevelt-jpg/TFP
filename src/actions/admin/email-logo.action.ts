"use server";

import { revalidatePath } from "next/cache";

import * as z from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { upsertCmsValue } from "@/lib/cms/store";
import { uploadEmailLogo } from "@/lib/mail/logo";
import { actionClient } from "@/lib/safe-action";
import { db } from "@/db";

const schema = z.object({
  /** Base64 of the PNG/JPEG (no data: prefix). */
  dataBase64: z.string().min(32),
  contentType: z
    .string()
    .regex(/^image\/(png|jpeg|jpg|webp)$/i, "PNG or JPEG only"),
  fileName: z.string().min(1).max(120).optional(),
});

export const uploadEmailLogoAction = actionClient
  .metadata({ actionName: "admin.uploadEmailLogo" })
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    const bytes = Buffer.from(parsedInput.dataBase64, "base64");
    if (bytes.byteLength < 64) {
      throw new Error("File looks empty");
    }

    await uploadEmailLogo(bytes, parsedInput.contentType.toLowerCase());

    await upsertCmsValue({
      namespace: "landing",
      key: "brand.emailLogo",
      value: "/email/logo.png",
      updatedBy: session.user.email,
    });

    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "email.logo.upload",
        entityType: "EmailBranding",
        entityId: "performance-logo",
      },
    });

    revalidatePath("/admin/cms");
    revalidatePath("/admin/integrations");

    return {
      ok: true,
      bytes: bytes.byteLength,
      fileName: parsedInput.fileName ?? "performance-logo.png",
    };
  });
