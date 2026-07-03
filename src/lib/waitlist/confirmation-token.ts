import * as z from "zod";

import type { WaitlistConfirmation } from "@/data/waitlist/dto";

// STUB SEAM (P3 removes this): with no database yet, the confirmation id is an
// opaque base64url token carrying just what /joined renders. In P3 the action
// returns a real persisted-lead id and the DAL does a Supabase select instead —
// this file is deleted and the page/query signatures stay the same.

const tokenSchema = z.object({
  ref: z.string(),
  firstName: z.string().optional(),
});

export function encodeConfirmationToken(data: WaitlistConfirmation): string {
  const json = JSON.stringify(data);
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeConfirmationToken(
  token: string,
): WaitlistConfirmation | null {
  try {
    const json = Buffer.from(token, "base64url").toString("utf8");
    const result = tokenSchema.safeParse(JSON.parse(json));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
