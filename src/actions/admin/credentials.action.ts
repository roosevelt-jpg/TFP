"use server";

import * as z from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { ALL_CREDENTIAL_KEYS } from "@/lib/secrets/catalog";
import {
  deleteIntegrationSecret,
  upsertIntegrationSecret,
} from "@/lib/secrets/store";
import { assertVaultUnlocked } from "@/lib/secrets/vault-passcode";
import { actionClient } from "@/lib/safe-action";

const keySchema = z
  .string()
  .refine((k) => (ALL_CREDENTIAL_KEYS as readonly string[]).includes(k), {
    message: "Unknown credential key",
  });

export const saveIntegrationSecretAction = actionClient
  .metadata({ actionName: "admin.saveIntegrationSecret" })
  .inputSchema(
    z.object({
      key: keySchema,
      value: z.string().min(1).max(8_000),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    await assertVaultUnlocked(session.user.id);
    await upsertIntegrationSecret({
      key: parsedInput.key,
      value: parsedInput.value,
      updatedBy: session.user.email,
    });
    return { ok: true as const, key: parsedInput.key };
  });

export const clearIntegrationSecretAction = actionClient
  .metadata({ actionName: "admin.clearIntegrationSecret" })
  .inputSchema(z.object({ key: keySchema }))
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    await assertVaultUnlocked(session.user.id);
    await deleteIntegrationSecret(parsedInput.key);
    return { ok: true as const, key: parsedInput.key };
  });
