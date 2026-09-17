import type { SubscriptionStatus } from "@/generated/prisma/enums";

// Per Indigo's write spec, 28 July 2026. programme-active is theirs: they set
// it once the member messages the bot, so we only ever remove it on cancel.
// Pipeline stages are theirs too: their automation moves cards off these tags.
export const TAGS = {
  trackB: "track-b",
  trackA: "track-a",
  tierProgramme: "tier-programme",
  waitlist: "waitlist",
  consentWhatsApp: "consent-whatsapp",
  noWhatsAppOptIn: "no-wa-optin",
  programmeWelcome: "programme-welcome",
  overdue: "overdue",
  paymentRecovery: "payment-recovery",
  paused: "paused",
  cancelled: "cancelled",
  intakeStalled: "intake-stalled",
  checkoutAbandoned: "checkout-abandoned",
  programmeActive: "programme-active",
} as const;

export const PURCHASE_TAGS = [TAGS.trackB, TAGS.tierProgramme];

// Consent is a condition of paying (CHECKOUT_CONSENT_TEXT), so there is no
// branch. programme-welcome fires their T1 template.
export const PURCHASE_TAGS_TO_ADD = [
  TAGS.consentWhatsApp,
  TAGS.programmeWelcome,
];

export const PURCHASE_TAGS_TO_REMOVE = [
  TAGS.trackA,
  TAGS.waitlist,
  TAGS.noWhatsAppOptIn,
];

export const INTAKE_COMPLETE_TAGS_TO_REMOVE = [TAGS.intakeStalled];

export type SubscriptionField = "Active" | "Paused" | "Cancelled" | "Overdue";

type Transition = {
  add: string[];
  remove: string[];
  subscriptionStatus: SubscriptionField;
};

export function tagsForStatus(status: SubscriptionStatus): Transition | null {
  switch (status) {
    case "trialing":
    case "active":
      return {
        add: [],
        remove: [TAGS.overdue, TAGS.paused, TAGS.paymentRecovery],
        subscriptionStatus: "Active",
      };

    case "past_due":
    case "unpaid":
      return {
        add: [TAGS.overdue, TAGS.paymentRecovery],
        remove: [],
        subscriptionStatus: "Overdue",
      };

    case "canceled":
      return {
        add: [TAGS.cancelled],
        remove: [TAGS.programmeActive],
        subscriptionStatus: "Cancelled",
      };

    case "paused":
      return {
        add: [TAGS.paused],
        remove: [],
        subscriptionStatus: "Paused",
      };

    // A first payment that never landed grants nothing, so there is nothing to
    // revoke either.
    case "incomplete":
    case "incomplete_expired":
      return null;
  }
}
