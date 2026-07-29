import { describe, expect, it } from "vitest";

import {
  INTAKE_COMPLETE_TAGS_TO_REMOVE,
  PURCHASE_TAGS,
  PURCHASE_TAGS_TO_ADD,
  PURCHASE_TAGS_TO_REMOVE,
  TAGS,
  tagsForStatus,
} from "@/lib/ghl/membership-tags";
import { SubscriptionStatus } from "@/generated/prisma/enums";

describe("purchase tags", () => {
  it("marks the buyer as a programme member", () => {
    expect(PURCHASE_TAGS).toEqual(["track-b", "tier-programme"]);
  });

  // Consent is a condition of paying, so this is unconditional.
  it("records consent and fires the welcome template", () => {
    expect(PURCHASE_TAGS_TO_ADD).toEqual([
      TAGS.consentWhatsApp,
      TAGS.programmeWelcome,
    ]);
  });

  it("clears the supplement track, the waitlist and the opt-out", () => {
    expect(PURCHASE_TAGS_TO_REMOVE).toEqual([
      TAGS.trackA,
      TAGS.waitlist,
      TAGS.noWhatsAppOptIn,
    ]);
  });

  // The one tag their side owns. Granting it ourselves would mark someone an
  // active coached member before they have spoken to the bot.
  it("never grants programme-active", () => {
    expect([...PURCHASE_TAGS, ...PURCHASE_TAGS_TO_ADD]).not.toContain(
      TAGS.programmeActive,
    );
  });

  it("stops the intake nudge only once the answers are in", () => {
    expect(INTAKE_COMPLETE_TAGS_TO_REMOVE).toEqual([TAGS.intakeStalled]);
    expect(PURCHASE_TAGS_TO_REMOVE).not.toContain(TAGS.intakeStalled);
  });
});

describe("tagsForStatus", () => {
  const cases: [SubscriptionStatus, string[], string[]][] = [
    [SubscriptionStatus.trialing, [], [TAGS.overdue, TAGS.paymentRecovery]],
    [SubscriptionStatus.active, [], [TAGS.overdue, TAGS.paused]],
    [SubscriptionStatus.past_due, [TAGS.overdue, TAGS.paymentRecovery], []],
    [SubscriptionStatus.canceled, [TAGS.cancelled], [TAGS.programmeActive]],
    [SubscriptionStatus.paused, [TAGS.paused], []],
  ];

  for (const [status, expectAdd, expectRemove] of cases) {
    it(`${status} adds ${expectAdd} and removes ${expectRemove}`, () => {
      const t = tagsForStatus(status);

      expect(t).not.toBeNull();
      for (const tag of expectAdd) expect(t?.add).toContain(tag);
      for (const tag of expectRemove) expect(t?.remove).toContain(tag);
    });
  }

  // Cancelling is the only time access is ours to revoke. Adding it back on
  // recovery would grant coaching to someone who never opened the conversation.
  it("only ever removes programme-active, never adds it", () => {
    for (const status of Object.values(SubscriptionStatus)) {
      expect(tagsForStatus(status)?.add ?? []).not.toContain(
        TAGS.programmeActive,
      );
    }

    expect(tagsForStatus(SubscriptionStatus.canceled)?.remove).toContain(
      TAGS.programmeActive,
    );
  });

  it("clears every dunning marker when a failed payment recovers", () => {
    const recovered = tagsForStatus(SubscriptionStatus.active);

    expect(recovered?.remove).toEqual(
      expect.arrayContaining([TAGS.overdue, TAGS.paused, TAGS.paymentRecovery]),
    );
  });

  it("writes the subscription_status field to match", () => {
    expect(tagsForStatus(SubscriptionStatus.active)?.subscriptionStatus).toBe(
      "Active",
    );
    expect(tagsForStatus(SubscriptionStatus.past_due)?.subscriptionStatus).toBe(
      "Overdue",
    );
    expect(tagsForStatus(SubscriptionStatus.canceled)?.subscriptionStatus).toBe(
      "Cancelled",
    );
    expect(tagsForStatus(SubscriptionStatus.paused)?.subscriptionStatus).toBe(
      "Paused",
    );
  });

  it("does nothing for a subscription that never started", () => {
    expect(tagsForStatus(SubscriptionStatus.incomplete)).toBeNull();
    expect(tagsForStatus(SubscriptionStatus.incomplete_expired)).toBeNull();
  });
});
