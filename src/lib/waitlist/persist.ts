import "server-only";

import { headers } from "next/headers";

import { db } from "@/db";
import { Prisma } from "@/generated/prisma/client";

import { generatePublicToken, generateRef } from "./ref";

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

/**
 * Best-effort client IP for consent evidence. Prefers the platform-attested
 * header over the client-settable leftmost x-forwarded-for hop; still not
 * authoritative (spoofable if the app is ever hit without a trusted proxy).
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const attested = h.get("x-real-ip") ?? h.get("x-vercel-forwarded-for");
  if (attested) return attested.trim();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
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
};

/**
 * Upserts a waitlist lead, idempotent on email: a returning email refreshes its
 * `details` but keeps the row it first got — original ref, token, consent and
 * first-touch attribution. Returns the public token for the confirmation URL.
 *
 * ref/publicToken are random; the DB unique constraints are the source of truth
 * for their uniqueness, and we retry on the (near-impossible) collision.
 */
export async function upsertWaitlistLead(
  details: LeadDetails,
  createOnly: CreateOnlyFields,
): Promise<string> {
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
        update: details,
        select: { publicToken: true },
      });
      return lead.publicToken;
    } catch (error) {
      if (isRefCollision(error) && attempt < MAX_REF_ATTEMPTS - 1) continue;
      throw error;
    }
  }
  throw new Error("Could not generate a unique waitlist reference.");
}
