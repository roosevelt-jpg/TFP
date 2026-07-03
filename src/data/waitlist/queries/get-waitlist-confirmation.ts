import "server-only";

import { cache } from "react";

import { firstNameOf } from "@/lib/name";
import { db } from "@/db";

import type { WaitlistConfirmation } from "../dto";

/**
 * Fetches the confirmation for a waitlist sign-up by its public token — the
 * unguessable value handed to /joined after a successful submit.
 *
 * Public query, no auth: knowing the token is the capability. Returns null if
 * it doesn't resolve, so the page renders its in-page "not found" state.
 */
export const getWaitlistConfirmation = cache(
  async (publicToken: string): Promise<WaitlistConfirmation | null> => {
    const lead = await db.waitlist.findUnique({
      where: { publicToken },
      select: { ref: true, name: true },
    });

    if (!lead) return null;

    return {
      ref: lead.ref,
      firstName: firstNameOf(lead.name) || undefined,
    };
  },
);
