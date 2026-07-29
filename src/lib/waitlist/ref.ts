import "server-only";

import { randomBytes, randomInt } from "node:crypto";

// Crockford base32 — excludes I, L, O, U to avoid misreads when spoken/typed.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const REF_LENGTH = 8;

// Human-readable display code. Uniqueness is enforced by the DB constraint, not
// here — the caller retries on a collision.
export function generateRef(prefix = "WL"): string {
  let code = "";
  for (let i = 0; i < REF_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${prefix}-${code}`;
}

// Unguessable ~192-bit key for the /joined URL, so the primary key is never
// exposed and confirmations can't be enumerated.
export function generatePublicToken(): string {
  return randomBytes(24).toString("base64url");
}
