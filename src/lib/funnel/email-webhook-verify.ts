import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 5 * 60;

export type EmailWebhookCheck =
  | { ok: true; id: string }
  | { ok: false; reason: "missing" | "stale" | "signature" };

/** Resend signs webhooks with Svix (`whsec_` + base64 key). */
export function verifyResendWebhook(
  payload: string,
  headers: Headers,
  secret: string,
  now = Date.now(),
): EmailWebhookCheck {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!id || !timestamp || !signature || !secret) {
    return { ok: false, reason: "missing" };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > TOLERANCE_SECONDS) {
    return { ok: false, reason: "stale" };
  }

  const raw = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const key = Buffer.from(raw, "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");

  const ok = signature.split(" ").some((part) => {
    const sig = part.startsWith("v1,") ? part.slice(3) : part;
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });

  return ok ? { ok: true, id } : { ok: false, reason: "signature" };
}
