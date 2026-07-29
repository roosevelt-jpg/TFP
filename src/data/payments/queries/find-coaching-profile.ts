import "server-only";

import { db } from "@/db";

export type CoachingAnswers = {
  goal: string | null;
  level: string | null;
  sex: string | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  goalWeightKg: number | null;
  diet: string | null;
  injuries: string | null;
};

// Null until onboarding is completed, which is what lets the success page show
// the answers back on a refresh instead of an empty form.
export async function findCompletedCoachingProfile(
  customerId: string,
): Promise<CoachingAnswers | null> {
  const profile = await db.coachingProfile.findFirst({
    where: { customerId, completedAt: { not: null } },
    select: {
      goal: true,
      level: true,
      sex: true,
      age: true,
      heightCm: true,
      weightKg: true,
      goalWeightKg: true,
      diet: true,
      injuries: true,
    },
  });

  return profile ?? null;
}
