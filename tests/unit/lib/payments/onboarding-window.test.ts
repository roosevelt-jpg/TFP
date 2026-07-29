import { describe, expect, it } from "vitest";

import {
  isWithinOnboardingWindow,
  ONBOARDING_WINDOW_SECONDS,
} from "@/lib/payments/onboarding-window";

const nowSeconds = () => Math.floor(Date.now() / 1000);
const agoSeconds = (seconds: number) => nowSeconds() - seconds;
const agoDate = (seconds: number) => new Date(Date.now() - seconds * 1000);

describe("isWithinOnboardingWindow", () => {
  it("boxes the window at 24 hours", () => {
    expect(ONBOARDING_WINDOW_SECONDS).toBe(86_400);
  });

  it("accepts a recent purchase, as a date or as unix seconds", () => {
    expect(isWithinOnboardingWindow(agoDate(60))).toBe(true);
    expect(isWithinOnboardingWindow(agoSeconds(60))).toBe(true);
  });

  it("rejects one past the window", () => {
    expect(isWithinOnboardingWindow(agoDate(25 * 60 * 60))).toBe(false);
    expect(isWithinOnboardingWindow(agoSeconds(25 * 60 * 60))).toBe(false);
  });

  // A purchase with no timestamp can't be shown to be recent, so it isn't.
  it("rejects a null timestamp", () => {
    expect(isWithinOnboardingWindow(null)).toBe(false);
  });
});
