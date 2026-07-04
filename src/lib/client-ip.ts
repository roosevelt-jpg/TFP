import "server-only";

import { headers } from "next/headers";

// Prefer the platform-attested header over the client-settable x-forwarded-for
// (spoofable without a trusted proxy). Used both as consent evidence and as the
// rate-limit key, so the key can't be trivially rotated by a caller.
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const attested = h.get("x-real-ip") ?? h.get("x-vercel-forwarded-for");
  if (attested) return attested.trim();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
