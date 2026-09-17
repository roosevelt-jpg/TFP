import "server-only";

import { createHmac } from "node:crypto";

import { env } from "@/env";
import { resolveSecret } from "@/lib/secrets/store";

/** Opaque token embedded in Telegram deep-link start payload. */
export function telegramActivationToken(customerId: string): string {
  const secret = env.BETTER_AUTH_SECRET;
  const sig = createHmac("sha256", secret)
    .update(`tg:${customerId}`)
    .digest("hex")
    .slice(0, 16);
  return `tfp_${customerId}_${sig}`;
}

export function parseTelegramActivationToken(
  payload: string,
): string | null {
  const match = /^tfp_([a-z0-9]+)_([a-f0-9]{16})$/i.exec(payload.trim());
  if (!match) return null;
  const customerId = match[1]!;
  const expected = telegramActivationToken(customerId);
  if (expected !== payload.trim()) return null;
  return customerId;
}

export async function telegramActivationUrl(
  customerId: string,
): Promise<string | null> {
  if (
    env.TELEGRAM_ACTIVATION_ENABLED !== true &&
    String(env.TELEGRAM_ACTIVATION_ENABLED) !== "true"
  ) {
    return null;
  }
  const username =
    (await resolveSecret("TELEGRAM_BOT_USERNAME")) ??
    process.env.TELEGRAM_BOT_USERNAME;
  const botToken =
    (await resolveSecret("TELEGRAM_BOT_TOKEN")) ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!username || !botToken) return null;
  const token = telegramActivationToken(customerId);
  return `https://t.me/${username.replace(/^@/, "")}?start=${token}`;
}
