import "server-only";

import { cache } from "react";

import { firstNameOf } from "@/lib/name";
import { db } from "@/db";

import type { WaitlistConfirmation } from "../dto";

// Looked up by the unguessable publicToken — knowing it is the capability, so
// no auth. Null when it doesn't resolve (page shows its in-page not-found).
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
