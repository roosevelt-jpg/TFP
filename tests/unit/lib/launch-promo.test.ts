import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  LAUNCH_PROMOTION_CODE,
  LAUNCH_PROMOTION_LIMIT,
  PRICE_TODAY,
} from "@/lib/pricing";

// The launch email tells 33 people the code works for the first 50 and halves
// the price. Stripe enforces those terms, so a drift between the two is a
// promise we cannot keep.
describe("launch promotion", () => {
  it("matches the coupon the bootstrap script creates", () => {
    const bootstrap = readFileSync(
      join(process.cwd(), "scripts/stripe-bootstrap.ts"),
      "utf8",
    );

    // Imported rather than redefined, so the script and the email cannot drift.
    expect(bootstrap).toMatch(/from "\.\.\/src\/lib\/pricing"/);
    expect(bootstrap).not.toMatch(/const LAUNCH_PROMOTION_CODE =/);
    expect(bootstrap).toMatch(/percent_off: 50/);
    expect(bootstrap).toMatch(/duration: "once"/);
  });

  it("halves cleanly, so the email can state an exact price", () => {
    expect(PRICE_TODAY / 2).toBe(74.5);
  });

  it("is the code and limit set live in Stripe", () => {
    expect(LAUNCH_PROMOTION_CODE).toBe("FORMULA50");
    expect(LAUNCH_PROMOTION_LIMIT).toBe(50);
  });
});

// A placeholder renders for every visitor, so a live code there hands the
// discount to people who were never sent it. This happened once.
it("is never used as placeholder text in the checkout form", () => {
  const form = readFileSync(
    join(process.cwd(), "src/features/checkout/IntakeForm.tsx"),
    "utf8",
  );

  const placeholders = [...form.matchAll(/placeholder="([^"]*)"/g)].map(
    (match) => match[1],
  );

  expect(placeholders).not.toContain(LAUNCH_PROMOTION_CODE);
});
