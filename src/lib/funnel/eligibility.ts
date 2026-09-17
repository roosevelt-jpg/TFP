import "server-only";

import { db } from "@/db";

export type Channel = "email" | "whatsapp" | "telegram" | "instagram" | "marketing";

export type ChannelEligibilityInput = {
  channel: Channel;
  customerId?: string | null;
  waitlistId?: string | null;
  email?: string | null;
  /** Transactional programme mail (welcome, receipt) vs promotional nurture/recovery. */
  purpose: "transactional" | "lifecycle" | "marketing" | "ops";
};

export type ChannelEligibilityResult = {
  eligible: boolean;
  reason: string;
  consentId?: string;
};

/**
 * Spec §11.1 — every outbound must pass eligibility before send.
 * Transactional programme mail is allowed when programme consent exists (or paid customer).
 * Marketing/lifecycle requires an active granted consent that is not withdrawn.
 */
export async function checkChannelEligibility(
  input: ChannelEligibilityInput,
): Promise<ChannelEligibilityResult> {
  if (input.purpose === "ops") {
    return { eligible: true, reason: "ops_channel_exempt" };
  }

  const email = input.email?.trim().toLowerCase();
  let customerId = input.customerId ?? null;
  let waitlistId = input.waitlistId ?? null;

  if (!customerId && email) {
    const customer = await db.customer.findUnique({
      where: { email },
      select: { id: true, waitlistId: true },
    });
    customerId = customer?.id ?? null;
    waitlistId = waitlistId ?? customer?.waitlistId ?? null;
  }

  if (!waitlistId && email) {
    const lead = await db.waitlist.findUnique({
      where: { email },
      select: { id: true },
    });
    waitlistId = lead?.id ?? null;
  }

  const channelKey =
    input.channel === "marketing" ? "email" : input.channel;

  const consents = await db.consentRecord.findMany({
    where: {
      OR: [
        ...(customerId ? [{ customerId }] : []),
        ...(waitlistId ? [{ waitlistId }] : []),
      ],
      channel: { in: [channelKey, "marketing", "programme"] },
    },
    orderBy: { capturedAt: "desc" },
    take: 40,
  });

  const withdrawn = consents.find(
    (c) =>
      (c.status === "withdrawn" || c.withdrawnAt != null) &&
      (c.channel === channelKey || c.channel === "marketing"),
  );
  if (withdrawn) {
    return {
      eligible: false,
      reason: `consent_withdrawn:${withdrawn.channel}`,
      consentId: withdrawn.id,
    };
  }

  if (input.purpose === "transactional") {
    if (customerId) {
      return { eligible: true, reason: "transactional_customer" };
    }
    const programme = consents.find(
      (c) =>
        c.status === "granted" &&
        !c.withdrawnAt &&
        (c.channel === "programme" || c.channel === channelKey),
    );
    if (programme) {
      return {
        eligible: true,
        reason: "transactional_programme_consent",
        consentId: programme.id,
      };
    }
    return { eligible: false, reason: "no_transactional_identity" };
  }

  if (customerId && input.purpose === "marketing") {
    const purchased = await db.purchase.count({
      where: { customerId, status: "paid" },
    });
    if (purchased > 0) {
      const marketingConsent = consents.find(
        (c) =>
          c.status === "granted" &&
          !c.withdrawnAt &&
          c.channel === "marketing",
      );
      if (!marketingConsent) {
        return { eligible: false, reason: "purchased_no_marketing_consent" };
      }
    }
  }

  if (customerId && input.purpose === "lifecycle") {
    const purchased = await db.purchase.count({
      where: { customerId, status: "paid" },
    });
    if (purchased > 0) {
      return { eligible: false, reason: "already_purchased" };
    }
  }

  const granted = consents.find(
    (c) =>
      c.status === "granted" &&
      !c.withdrawnAt &&
      (c.channel === channelKey ||
        c.channel === "marketing" ||
        (input.purpose === "lifecycle" && c.channel === "email")),
  );

  if (!granted) {
    return { eligible: false, reason: `no_consent:${channelKey}` };
  }

  return {
    eligible: true,
    reason: `consent_granted:${granted.channel}/${granted.purpose}`,
    consentId: granted.id,
  };
}

export async function assertChannelEligible(
  input: ChannelEligibilityInput,
): Promise<ChannelEligibilityResult> {
  const result = await checkChannelEligibility(input);
  if (!result.eligible) {
    const err = new Error(`Channel not eligible: ${result.reason}`);
    err.name = "ChannelEligibilityError";
    throw err;
  }
  return result;
}

export function isChannelEligibilityError(error: unknown): boolean {
  return error instanceof Error && error.name === "ChannelEligibilityError";
}

/** Withdraw marketing consent (append-only). */
export async function withdrawConsent(input: {
  customerId?: string | null;
  waitlistId?: string | null;
  channel: Channel;
  source: string;
  policyVersion: string;
}) {
  return db.consentRecord.create({
    data: {
      customerId: input.customerId ?? undefined,
      waitlistId: input.waitlistId ?? undefined,
      channel: input.channel === "marketing" ? "marketing" : input.channel,
      purpose: "opt_out",
      status: "withdrawn",
      source: input.source,
      policyVersion: input.policyVersion,
      capturedAt: new Date(),
      withdrawnAt: new Date(),
    },
  });
}
