import { createHash } from "node:crypto";

// Stripe prunes keys after 24h, so bucketing by hour is well inside the window
// it honours. Hashed because their guidance is to keep personal identifiers out
// of keys.
const BUCKET_MS = 3_600_000;

function key(scope: string, parts: string[]): string {
  const bucket = Math.floor(Date.now() / BUCKET_MS);
  return createHash("sha256")
    .update(`${scope}:${parts.join(":")}:${bucket}`)
    .digest("hex")
    .slice(0, 40);
}

export function customerIdempotencyKey(
  email: string,
  whatsapp: string,
): string {
  return key("customer", [email, whatsapp]);
}

// Covers an accidental double submit only. A deliberate retry after a declined
// card falls outside the bucket and correctly gets a fresh session.
export function checkoutIdempotencyKey(stripeCustomerId: string): string {
  return key("checkout", [stripeCustomerId]);
}

// Must be stable across a retry inside the same bucket as the key above:
// Stripe rejects a reused idempotency key whose parameters have changed, and
// eventId travels in the session metadata. A random one per attempt made every
// retry within the hour fail outright.
export function checkoutEventId(stripeCustomerId: string): string {
  return key("event", [stripeCustomerId]);
}
