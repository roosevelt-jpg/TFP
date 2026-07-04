import "server-only";

import { env } from "@/env";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type SiteverifyResponse = {
  success: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

// Verify a Turnstile token server-side. Fails closed: a missing/invalid/reused
// token is rejected (single-use, 300s TTL); a network failure rejects too — bot
// protection shouldn't silently open on an outage. `expectedAction` binds the
// token to one form so a token minted elsewhere (the site key is public) can't
// be replayed against a different action. Hostname is already enforced by the
// widget's registered domains in Cloudflare.
export async function verifyTurnstile(
  token: string | undefined | null,
  remoteip: string | null,
  expectedAction: string,
): Promise<boolean> {
  if (!token) return false;

  try {
    const res = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        ...(remoteip ? { remoteip } : {}),
      }),
    });
    const data: SiteverifyResponse = await res.json();
    return data.success === true && data.action === expectedAction;
  } catch {
    return false;
  }
}
