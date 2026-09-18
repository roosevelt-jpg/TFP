import "server-only";

import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";

import { env } from "@/env";
import {
  deleteIntegrationSecret,
  readIntegrationSecret,
  upsertIntegrationSecret,
} from "@/lib/secrets/store";

/** Reserved — never shown in the credentials catalog. */
export const INTEGRATIONS_VAULT_PASSCODE_KEY = "INTEGRATIONS_VAULT_PASSCODE";

const COOKIE_NAME = "tfp_integrations_vault";
const UNLOCK_TTL_MS = 30 * 60 * 1000;

function hmac(payload: string) {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(payload)
    .digest("base64url");
}

export function hashVaultPasscode(passcode: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(passcode, salt, 64);
  return `v1:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export function verifyVaultPasscode(passcode: string, stored: string) {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const [, saltB64, hashB64] = parts;
  try {
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const actual = scryptSync(passcode, salt, expected.length);
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function vaultPasscodeConfigured() {
  const stored = await readIntegrationSecret(INTEGRATIONS_VAULT_PASSCODE_KEY);
  return Boolean(stored);
}

export async function setVaultPasscode(input: {
  passcode: string;
  updatedBy: string;
}) {
  const hashed = hashVaultPasscode(input.passcode);
  await upsertIntegrationSecret({
    key: INTEGRATIONS_VAULT_PASSCODE_KEY,
    value: hashed,
    updatedBy: input.updatedBy,
  });
}

export async function clearVaultPasscode() {
  await deleteIntegrationSecret(INTEGRATIONS_VAULT_PASSCODE_KEY);
}

export async function checkVaultPasscode(passcode: string) {
  const stored = await readIntegrationSecret(INTEGRATIONS_VAULT_PASSCODE_KEY);
  if (!stored) return false;
  return verifyVaultPasscode(passcode, stored);
}

function unlockToken(userId: string, exp: number) {
  const payload = `${userId}.${exp}`;
  return `${payload}.${hmac(payload)}`;
}

export async function markVaultUnlocked(userId: string) {
  const exp = Date.now() + UNLOCK_TTL_MS;
  const jar = await cookies();
  jar.set(COOKIE_NAME, unlockToken(userId, exp), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin/integrations",
    maxAge: Math.floor(UNLOCK_TTL_MS / 1000),
  });
}

export async function clearVaultUnlock() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function isVaultUnlocked(userId: string) {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return false;
  const parts = raw.split(".");
  if (parts.length !== 3) return false;
  const [uid, expStr, sig] = parts;
  if (uid !== userId) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = hmac(`${uid}.${exp}`);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function assertVaultUnlocked(userId: string) {
  if (!(await isVaultUnlocked(userId))) {
    throw new Error("Integrations vault is locked — enter the passcode first");
  }
}
