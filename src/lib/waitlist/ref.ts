import "server-only";

import { randomBytes, randomInt } from "node:crypto";

// Crockford base32 — excludes I, L, O, U to avoid misreads when spoken/typed.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const REF_LENGTH = 8;

/**
 * A random, human-readable waitlist reference (e.g. "WL-7H2K9F4B").
 *
 * Opaque and non-enumerable (doesn't leak sign-up counts). Uniqueness is
 * guaranteed by the `Waitlist.ref` unique constraint, not by this function —
 * the caller inserts and retries on a conflict. 32^8 ≈ 1.1e12 keyspace, so
 * collisions are negligible.
 */
export function generateRef(): string {
  let code = "";
  for (let i = 0; i < REF_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `WL-${code}`;
}

/**
 * A high-entropy, URL-safe token (~192 bits) used as the unguessable key in the
 * /joined confirmation URL — so the internal primary key is never exposed and
 * confirmations can't be enumerated.
 */
export function generatePublicToken(): string {
  return randomBytes(24).toString("base64url");
}
