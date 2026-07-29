import "server-only";

import { db } from "@/db";
import type { Prisma } from "@/generated/prisma/client";

// Upsert, not create: someone who reloads the success page and answers again
// should refine their answers rather than hit a unique-constraint error.
export async function saveCoachingProfile(
  customerId: string,
  answers: Omit<Prisma.CoachingProfileCreateInput, "customer" | "completedAt">,
): Promise<void> {
  const completedAt = new Date();

  await db.coachingProfile.upsert({
    where: { customerId },
    create: {
      ...answers,
      completedAt,
      customer: { connect: { id: customerId } },
    },
    update: { ...answers, completedAt },
  });
}
