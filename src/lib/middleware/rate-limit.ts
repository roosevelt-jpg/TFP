import { createMiddleware } from "next-safe-action";

import { clientIp } from "@/lib/client-ip";
import { AppError, ERROR_CODES } from "@/lib/errors/app-error";
import { checkRateLimit, type RateLimitTier } from "@/lib/rate-limit";

function emailKey(clientInput: unknown): string | null {
  if (
    typeof clientInput === "object" &&
    clientInput !== null &&
    "email" in clientInput &&
    typeof clientInput.email === "string"
  ) {
    return clientInput.email.trim().toLowerCase().slice(0, 200) || null;
  }
  return null;
}

async function enforce(tier: RateLimitTier, key: string) {
  const { success, retryAfter } = await checkRateLimit(tier, key);
  if (!success) {
    throw new AppError(
      ERROR_CODES.RATE_LIMITED,
      `Too many attempts. Please wait ${retryAfter} seconds and try again.`,
    );
  }
}

export const rateLimitMiddleware = createMiddleware<{
  metadata: { actionName: string };
}>().define(async ({ next, clientInput, metadata }) => {
  await enforce("global", "all");

  const ip = await clientIp();
  if (ip) await enforce("ip", `${metadata.actionName}:${ip}`);

  const email = emailKey(clientInput);
  if (email) await enforce("email", `${metadata.actionName}:${email}`);

  return next();
});
