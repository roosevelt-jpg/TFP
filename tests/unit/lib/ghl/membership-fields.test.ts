import { describe, expect, it } from "vitest";

import {
  intakeFields,
  purchaseFields,
  type SubscriptionField,
  statusField,
  whatsAppOptInFields,
} from "@/lib/ghl/membership-fields";
import { GOAL_VALUES } from "@/lib/validation/waitlist/options";

// Every dropdown value below was read from the live location on 28 July 2026.
// GHL silently saves a non-matching value as blank, so a drift here loses the
// answer without any error to notice.
const LIVE_OPTIONS = {
  goal: ["Muscle", "Focus-energy", "Fat-loss", "General", "Performance"],
  track: ["A - Supplement", "B - Programme"],
  tier: ["Free", "Programme", "Pro", "Elite"],
  subscriptionStatus: [
    "Active",
    "Paused",
    "Cancelled",
    "Overdue",
  ] satisfies SubscriptionField[],
  intakeStatus: ["In progress", "minimum", "complete"],
  consentSource: ["thank_you_wa", "inbound", "email_wa"],
};

const GOAL_FIELD_ID = "WfN8KIRyitSf3AJWBdIK";
const GENDER_FIELD_ID = "gRynEbafi3YHazQhDsbF";

const fieldValue = (
  fields: { id: string; field_value: string }[],
  id: string,
) => fields.find((f) => f.id === id)?.field_value;

describe("purchaseFields", () => {
  const purchasedAt = new Date("2026-07-28T10:30:00Z");
  const fields = purchaseFields({
    stripeCustomerId: "cus_ABC123",
    purchasedAt,
  });

  it("writes only values the live dropdowns accept", () => {
    const written = Object.fromEntries(
      fields.map((f) => [f.id, f.field_value]),
    );

    expect(LIVE_OPTIONS.track).toContain(written.Lge0FM6DN0b3UMrLA5z6);
    expect(LIVE_OPTIONS.tier).toContain(written.pG2lT3l9dPVVp4zwZFP7);
    expect(LIVE_OPTIONS.subscriptionStatus).toContain(
      written.ubRlCjO6o0iOvDg8ePvj,
    );
    expect(LIVE_OPTIONS.intakeStatus).toContain(written.t4fjHKL8zkp14DHuc11b);
  });

  // Their weekly loop reads these, and a timestamp would not parse as a date.
  it("sends dates as plain yyyy-mm-dd", () => {
    for (const id of [
      "6oPwHpnlaRybMKjvrWlz",
      "a5flLmAzEL4lmQBtnFU8",
      "hdybjpY5BKfGYbDNAD2n",
      "AFZgQPirH8AkvZPb7k6S",
    ]) {
      expect(fieldValue(fields, id)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  // The block is exactly the trial, so it ends the day the first £79 lands.
  // That date is also what the welcome email promises them.
  it("ends the block eight weeks out and rolls over the same day", () => {
    expect(fieldValue(fields, "hdybjpY5BKfGYbDNAD2n")).toBe("2026-09-22");
    expect(fieldValue(fields, "AFZgQPirH8AkvZPb7k6S")).toBe("2026-09-22");
  });

  it("starts them on block one, week one, intake outstanding", () => {
    expect(fieldValue(fields, "zRmVEFGg4Gb1sdO4Aumd")).toBe("1");
    expect(fieldValue(fields, "36oMuRBAK2FQJIviEpz0")).toBe("1");
    expect(fieldValue(fields, "t4fjHKL8zkp14DHuc11b")).toBe("In progress");
  });

  it("carries the Stripe customer for support lookups", () => {
    expect(fieldValue(fields, "xOoe68HyCrB9YbQP1obG")).toBe("cus_ABC123");
  });
});

describe("whatsAppOptInFields", () => {
  const fields = whatsAppOptInFields(new Date("2026-07-28T10:30:00Z"));

  it("records the consent their coach checks before messaging", () => {
    expect(fieldValue(fields, "kWbeIJfGx2gtnKlsmMQF")).toBe("Yes");
    expect(fieldValue(fields, "swWor4YfiZZ6KXA7fxB1")).toBe("2026-07-28");
    expect(LIVE_OPTIONS.consentSource).toContain(
      fieldValue(fields, "bUuTpZK1d1Bw78pQNmwQ"),
    );
  });
});

describe("intakeFields", () => {
  // The whole point of the five-value alignment: every goal our form offers
  // must land on an option the coach's field actually has.
  it("maps every goal we offer onto a live option", () => {
    for (const goal of GOAL_VALUES) {
      const written = fieldValue(intakeFields({ goal }), GOAL_FIELD_ID);

      expect(written).toBeDefined();
      expect(LIVE_OPTIONS.goal).toContain(written);
    }
  });

  it("writes the programme Goal, not just the waitlist one", () => {
    const fields = intakeFields({ goal: "focus" });

    expect(fieldValue(fields, GOAL_FIELD_ID)).toBe("Focus-energy");
    // Waitlist Goal has no option for focus, so it is left alone.
    expect(fieldValue(fields, "WdeC9AyvSGSAgz3JWjTv")).toBeUndefined();
  });

  // Gender is the field the coach reads and it takes initials; Waitlist Sex is
  // the legacy twin taking full words. Writing only the latter left the coach's
  // column blank.
  it("writes Gender as an initial, beside the waitlist twin", () => {
    const fields = intakeFields({ sex: "male" });

    expect(fieldValue(fields, GENDER_FIELD_ID)).toBe("M");
    expect(fieldValue(fields, "bN2MybcVHGFn2Ofy4tuK")).toBe("Male");
  });

  it("maps female too", () => {
    expect(fieldValue(intakeFields({ sex: "female" }), GENDER_FIELD_ID)).toBe(
      "F",
    );
  });

  // Gender offers only M and F, so "other" has nowhere to go. It still reaches
  // the coach through Waitlist Sex rather than being dropped entirely.
  it("leaves Gender blank for a value it has no option for", () => {
    const fields = intakeFields({ sex: "other" });

    expect(fieldValue(fields, GENDER_FIELD_ID)).toBeUndefined();
    expect(fieldValue(fields, "bN2MybcVHGFn2Ofy4tuK")).toBe("Other");
  });

  it("stops their nudge only once the answers are in", () => {
    expect(
      fieldValue(intakeFields({ goal: "lose" }), "t4fjHKL8zkp14DHuc11b"),
    ).toBe("complete");
  });

  it("omits a goal it cannot map rather than blanking the field", () => {
    expect(
      fieldValue(intakeFields({ goal: "shred" }), GOAL_FIELD_ID),
    ).toBeUndefined();
  });
});

describe("statusField", () => {
  it("only ever writes a value the dropdown offers", () => {
    for (const status of LIVE_OPTIONS.subscriptionStatus) {
      expect(LIVE_OPTIONS.subscriptionStatus).toContain(
        statusField(status).field_value,
      );
    }
  });
});
