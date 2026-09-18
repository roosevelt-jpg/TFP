"use server";

import * as z from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { actionClient } from "@/lib/safe-action";
import {
  checkVaultPasscode,
  clearVaultUnlock,
  markVaultUnlocked,
  setVaultPasscode,
  vaultPasscodeConfigured,
} from "@/lib/secrets/vault-passcode";

const passcodeSchema = z
  .string()
  .min(6, "Passcode must be at least 6 characters")
  .max(128);

export const unlockIntegrationsVaultAction = actionClient
  .metadata({ actionName: "admin.unlockIntegrationsVault" })
  .inputSchema(z.object({ passcode: passcodeSchema }))
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    const configured = await vaultPasscodeConfigured();
    if (!configured) {
      return { ok: false as const, error: "No vault passcode set yet" };
    }
    const ok = await checkVaultPasscode(parsedInput.passcode);
    if (!ok) {
      return { ok: false as const, error: "Incorrect passcode" };
    }
    await markVaultUnlocked(session.user.id);
    return { ok: true as const };
  });

export const lockIntegrationsVaultAction = actionClient
  .metadata({ actionName: "admin.lockIntegrationsVault" })
  .inputSchema(z.object({}))
  .action(async () => {
    await requireAdminSession(["kane"]);
    await clearVaultUnlock();
    return { ok: true as const };
  });

/** First-time set when no passcode exists. */
export const createIntegrationsVaultPasscodeAction = actionClient
  .metadata({ actionName: "admin.createIntegrationsVaultPasscode" })
  .inputSchema(
    z.object({
      passcode: passcodeSchema,
      confirm: z.string().min(1),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    if (parsedInput.passcode !== parsedInput.confirm) {
      return { ok: false as const, error: "Passcodes do not match" };
    }
    if (await vaultPasscodeConfigured()) {
      return {
        ok: false as const,
        error: "Passcode already set — use reset instead",
      };
    }
    await setVaultPasscode({
      passcode: parsedInput.passcode,
      updatedBy: session.user.email,
    });
    await markVaultUnlocked(session.user.id);
    return { ok: true as const };
  });

/** Change passcode — requires current passcode. */
export const resetIntegrationsVaultPasscodeAction = actionClient
  .metadata({ actionName: "admin.resetIntegrationsVaultPasscode" })
  .inputSchema(
    z.object({
      currentPasscode: passcodeSchema,
      newPasscode: passcodeSchema,
      confirm: z.string().min(1),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    if (parsedInput.newPasscode !== parsedInput.confirm) {
      return { ok: false as const, error: "New passcodes do not match" };
    }
    if (!(await vaultPasscodeConfigured())) {
      return { ok: false as const, error: "No passcode set yet — create one first" };
    }
    const ok = await checkVaultPasscode(parsedInput.currentPasscode);
    if (!ok) {
      return { ok: false as const, error: "Current passcode is incorrect" };
    }
    await setVaultPasscode({
      passcode: parsedInput.newPasscode,
      updatedBy: session.user.email,
    });
    await markVaultUnlocked(session.user.id);
    return { ok: true as const };
  });
