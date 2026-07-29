import "server-only";

import { cache } from "react";

import { db } from "@/db";

// Looked up by the unguessable publicToken from a launch-email link. Knowing it
// only prefills the form and links the purchase for attribution — it grants
// nothing, so there's no auth here. Null when it doesn't resolve.
export const findWaitlistByToken = cache(
  async (publicToken: string): Promise<{ id: string; ref: string } | null> =>
    db.waitlist.findUnique({
      where: { publicToken },
      select: { id: true, ref: true },
    }),
);
