"use server";

import * as z from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { upsertCmsValue } from "@/lib/cms/store";
import { actionClient } from "@/lib/safe-action";

const schema = z.object({
  namespace: z.enum(["landing", "admin"]),
  key: z.string().min(1).max(200),
  value: z.string().max(20_000),
});

export const saveCmsFieldAction = actionClient
  .metadata({ actionName: "admin.saveCmsField" })
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "lemoni"]);
    await upsertCmsValue({
      ...parsedInput,
      updatedBy: session.user.email,
    });
    return { ok: true as const };
  });
