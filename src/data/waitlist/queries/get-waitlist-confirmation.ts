import "server-only";

import { cache } from "react";

import { decodeConfirmationToken } from "@/lib/waitlist/confirmation-token";

import type { WaitlistConfirmation } from "../dto";

/**
 * Fetches the confirmation record for a waitlist sign-up by its id.
 *
 * Public query — no auth, accessed via the opaque id handed to /joined after a
 * successful submit. Returns null if the id doesn't resolve (page → notFound).
 *
 * STUB: decodes the id (see confirmation-token). In P3 this becomes a Supabase
 * select on the persisted lead; the signature is unchanged.
 */
export const getWaitlistConfirmation = cache(
  async (id: string): Promise<WaitlistConfirmation | null> => {
    return decodeConfirmationToken(id);
  },
);
