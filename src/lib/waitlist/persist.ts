import "server-only";

import { firstNameOf } from "@/lib/name";
import { db } from "@/db";
import { Prisma } from "@/generated/prisma/client";

import { generatePublicToken, generateRef } from "./ref";

export { clientIp } from "@/lib/client-ip";

const MAX_REF_ATTEMPTS = 5;

function isRefCollision(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }
  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target : [target];
  return fields.some((f) => f === "ref" || f === "publicToken");
}

type LeadDetails = Omit<
  Prisma.WaitlistCreateInput,
  "ref" | "publicToken" | keyof CreateOnlyFields
>;

type CreateOnlyFields = {
  consentAt: Date;
  consentText: string;
  policyVersion: string;
  consentIp: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclid: string | null;
  gclid: string | null;
  referrer: string | null;
  landingPath: string | null;
  attributionCapturedAt: Date | null;
};

export type UpsertResult = {
  publicToken: string;
  ref: string;
  firstName: string;
  isNew: boolean;
};

// Idempotent on email: a returning email refreshes `details` but keeps its
// original ref/token/consent/attribution. Now that most profile fields are
// optional, the update only writes the values present this time — a returning
// lead resubmitting the minimal form must not null out answers they gave before.
export async function upsertWaitlistLead(
  details: LeadDetails,
  createOnly: CreateOnlyFields,
): Promise<UpsertResult> {
  const definedDetails = Object.fromEntries(
    Object.entries(details).filter(([, v]) => v != null),
  ) as Prisma.WaitlistUpdateInput;

  for (let attempt = 0; attempt < MAX_REF_ATTEMPTS; attempt++) {
    try {
      const lead = await db.waitlist.upsert({
        where: { email: details.email },
        create: {
          ...details,
          ...createOnly,
          ref: generateRef(),
          publicToken: generatePublicToken(),
        },
        update: definedDetails,
        select: {
          publicToken: true,
          ref: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return {
        publicToken: lead.publicToken,
        ref: lead.ref,
        firstName: firstNameOf(lead.name),
        isNew: lead.createdAt.getTime() === lead.updatedAt.getTime(),
      };
    } catch (error) {
      if (isRefCollision(error) && attempt < MAX_REF_ATTEMPTS - 1) continue;
      throw error;
    }
  }
  throw new Error("Could not generate a unique waitlist reference.");
}
