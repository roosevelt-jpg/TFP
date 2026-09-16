import { describe, expect, it } from "vitest";

import { runSpecialistCheck } from "@/lib/cto/specialist";

describe("runSpecialistCheck", () => {
  it("blocks subscription touches", () => {
    const result = runSpecialistCheck({
      action: "Update Kaching selling plan",
      objectIds: { planId: "x" },
      domain: "shopify",
    });
    expect(result.ok).toBe(false);
    expect(result.blockedReason).toMatch(/subscription/i);
  });

  it("blocks money movement", () => {
    const result = runSpecialistCheck({
      action: "Revolut pay supplier",
      objectIds: {},
      domain: "other",
    });
    expect(result.ok).toBe(false);
  });

  it("allows reversible meta pause", () => {
    const result = runSpecialistCheck({
      action: "Pause ad set Cold V3",
      objectIds: { adSetId: "1" },
      domain: "meta",
    });
    expect(result.ok).toBe(true);
    expect(result.verdict).toMatch(/Nathan/i);
  });
});
