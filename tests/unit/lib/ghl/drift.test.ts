import { describe, expect, it } from "vitest";

import { COMP_TAG, findDrift } from "@/lib/ghl/drift";
import {
  PURCHASE_TAGS,
  PURCHASE_TAGS_TO_ADD,
  TAGS,
} from "@/lib/ghl/membership-tags";

const ALL_EXPECTED = [...PURCHASE_TAGS, ...PURCHASE_TAGS_TO_ADD];

describe("findDrift", () => {
  it("leaves a correctly tagged member alone", () => {
    const drift = findDrift({ tags: ALL_EXPECTED, entitled: true });

    expect(drift.add).toEqual([]);
    expect(drift.suspect).toEqual([]);
  });

  // The failure this whole task exists for: the sync was enqueued, dropped, and
  // nothing retried it, so a paying member has none of their tags.
  it("restores every tag when the sync never ran", () => {
    const drift = findDrift({ tags: [], entitled: true });

    expect(drift.add).toEqual(ALL_EXPECTED);
  });

  it("restores only what is missing", () => {
    const drift = findDrift({
      tags: [TAGS.trackB, TAGS.consentWhatsApp],
      entitled: true,
    });

    expect(drift.add).toEqual([TAGS.tierProgramme, TAGS.programmeWelcome]);
  });

  // Their coach hand-tags contacts, so an unexpected tag is as likely to be her
  // decision as our bug. Reporting beats revoking.
  it("never removes anything, whatever the state", () => {
    const cases = [
      { tags: [...ALL_EXPECTED, TAGS.cancelled], entitled: true },
      { tags: [TAGS.programmeActive, "some-tag-she-added"], entitled: false },
      { tags: [TAGS.overdue, TAGS.paused], entitled: true },
    ];

    for (const member of cases) {
      expect(findDrift(member)).not.toHaveProperty("remove");
    }
  });

  it("flags a cancelled tag on someone still paying", () => {
    const drift = findDrift({
      tags: [...ALL_EXPECTED, TAGS.cancelled],
      entitled: true,
    });

    expect(drift.suspect).toEqual([TAGS.cancelled]);
    expect(drift.add).toEqual([]);
  });

  // The one drift that costs money: access granted to someone who stopped
  // paying. Worth waking a human for, but not worth revoking automatically.
  it("flags access held without entitlement", () => {
    const drift = findDrift({
      tags: [TAGS.trackB, TAGS.programmeActive],
      entitled: false,
    });

    expect(drift.suspect).toEqual([TAGS.programmeActive]);
    expect(drift.add).toEqual([]);
  });

  it("adds nothing to someone who is not entitled", () => {
    const drift = findDrift({ tags: [], entitled: false });

    expect(drift.add).toEqual([]);
    expect(drift.suspect).toEqual([]);
  });

  describe("comp exemption", () => {
    // Free access granted by hand. Reconcile touching these is exactly the bug
    // that would lose someone their access overnight.
    it("skips a comped member entirely", () => {
      const drift = findDrift({ tags: [COMP_TAG], entitled: false });

      expect(drift.exempt).toBe(true);
      expect(drift.add).toEqual([]);
      expect(drift.suspect).toEqual([]);
    });

    it("skips them even holding access with no subscription", () => {
      const drift = findDrift({
        tags: [COMP_TAG, TAGS.programmeActive],
        entitled: false,
      });

      expect(drift.exempt).toBe(true);
      expect(drift.suspect).toEqual([]);
    });

    it("skips them even when tags are missing", () => {
      const drift = findDrift({ tags: [COMP_TAG], entitled: true });

      expect(drift.exempt).toBe(true);
      expect(drift.add).toEqual([]);
    });
  });
});
