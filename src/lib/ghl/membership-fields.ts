import type { GhlCustomField } from "@/lib/clients/ghl";
import { toGhlCustomFields, type WaitlistProfile } from "@/lib/ghl/fields";
import { TRIAL_DAYS } from "@/lib/pricing";
import type { GoalValue, SexValue } from "@/lib/validation/waitlist/options";

// Read from the live location on 28 July 2026 (GET /locations/{id}/customFields).
const FIELD_IDS = {
  stripeCustomerId: "xOoe68HyCrB9YbQP1obG",
  track: "Lge0FM6DN0b3UMrLA5z6",
  tier: "pG2lT3l9dPVVp4zwZFP7",
  subscriptionStatus: "ubRlCjO6o0iOvDg8ePvj",
  programmeStartDate: "6oPwHpnlaRybMKjvrWlz",
  blockStartDate: "a5flLmAzEL4lmQBtnFU8",
  blockEndDate: "hdybjpY5BKfGYbDNAD2n",
  blockNumber: "zRmVEFGg4Gb1sdO4Aumd",
  programmeWeek: "36oMuRBAK2FQJIviEpz0",
  rolloverDate: "AFZgQPirH8AkvZPb7k6S",
  intakeStatus: "t4fjHKL8zkp14DHuc11b",
  whatsappOptIn: "kWbeIJfGx2gtnKlsmMQF",
  whatsappOptInDate: "swWor4YfiZZ6KXA7fxB1",
  consentSource: "bUuTpZK1d1Bw78pQNmwQ",
} as const;

// The programme's own copies of two intake answers, which are what the coach
// reads. Their Waitlist * twins hold different values and are written by
// toGhlCustomFields; these need their own mapping because a value outside the
// list saves as blank rather than erroring.
const PROGRAMME_ANSWERS = {
  // Not Waitlist Goal (WdeC9AyvSGSAgz3JWjTv), which keeps our three originals.
  goal: {
    id: "WfN8KIRyitSf3AJWBdIK",
    values: {
      lose: "Fat-loss",
      build: "Muscle",
      fit: "Performance",
      focus: "Focus-energy",
      general: "General",
    } satisfies Record<GoalValue, string>,
  },
  // Not Waitlist Sex (bN2MybcVHGFn2Ofy4tuK), which offers Male/Female/Other.
  // This one takes initials only, and has no option for "other".
  sex: {
    id: "gRynEbafi3YHazQhDsbF",
    values: { male: "M", female: "F" } satisfies Partial<
      Record<SexValue, string>
    >,
  },
} as const;

function programmeAnswer(
  answer: keyof typeof PROGRAMME_ANSWERS,
  value: string | null | undefined,
): GhlCustomField[] {
  if (!value) return [];

  const { id, values } = PROGRAMME_ANSWERS[answer];
  const mapped = new Map<string, string>(Object.entries(values)).get(value);

  return mapped ? [{ id, field_value: mapped }] : [];
}

const asDate = (value: Date) => value.toISOString().slice(0, 10);

const field = (id: string, value: string | number): GhlCustomField => ({
  id,
  field_value: String(value),
});

// intake_status starts In progress so their nudge journey knows the answers are
// still outstanding.
export function purchaseFields(input: {
  stripeCustomerId: string;
  purchasedAt: Date;
}): GhlCustomField[] {
  // The trial is exactly the block, so the block ends the day the first £79
  // lands. Same date the welcome email gives them.
  const blockEnd = new Date(input.purchasedAt);
  blockEnd.setDate(blockEnd.getDate() + TRIAL_DAYS);

  return [
    field(FIELD_IDS.stripeCustomerId, input.stripeCustomerId),
    field(FIELD_IDS.track, "B - Programme"),
    field(FIELD_IDS.tier, "Programme"),
    field(FIELD_IDS.subscriptionStatus, "Active"),
    field(FIELD_IDS.programmeStartDate, asDate(input.purchasedAt)),
    field(FIELD_IDS.blockStartDate, asDate(input.purchasedAt)),
    field(FIELD_IDS.blockEndDate, asDate(blockEnd)),
    field(FIELD_IDS.rolloverDate, asDate(blockEnd)),
    field(FIELD_IDS.blockNumber, 1),
    field(FIELD_IDS.programmeWeek, 1),
    field(FIELD_IDS.intakeStatus, "In progress"),
  ];
}

// Their coach checks this before messaging.
export function whatsAppOptInFields(consentedAt: Date): GhlCustomField[] {
  return [
    field(FIELD_IDS.whatsappOptIn, "Yes"),
    field(FIELD_IDS.whatsappOptInDate, asDate(consentedAt)),
    field(FIELD_IDS.consentSource, "thank_you_wa"),
  ];
}

// Only ever written with the answers beside it, or their nudge stops early.
//
// Writes both copies of goal and sex: the programme fields are what the coach
// reads, the Waitlist * ones are legacy. When the waitlist is retired the
// toGhlCustomFields call goes with it, and the numeric answers it also carries
// (age, height, weight) need programme fields of their own first.
export function intakeFields(answers: WaitlistProfile): GhlCustomField[] {
  return [
    ...toGhlCustomFields(answers),
    ...programmeAnswer("goal", answers.goal),
    ...programmeAnswer("sex", answers.sex),
    field(FIELD_IDS.intakeStatus, "complete"),
  ];
}

export type SubscriptionField = "Active" | "Paused" | "Cancelled" | "Overdue";

export function statusField(status: SubscriptionField): GhlCustomField {
  return field(FIELD_IDS.subscriptionStatus, status);
}
