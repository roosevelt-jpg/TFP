// @vitest-environment jsdom

/** biome-ignore-all lint/suspicious/noDocumentCookie: tests exercise the module's document.cookie storage directly (see the rationale in tracking-consent.ts). */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getStoredTrackingConsent,
  getTrackingConsent,
  onTrackingConsentChange,
  resolveTrackingConsent,
  setTrackingConsent,
  TRACKING_CONSENT_COOKIE,
} from "@/lib/tracking-consent";

function clearConsentCookie(): void {
  document.cookie = `${TRACKING_CONSENT_COOKIE}=; path=/; max-age=0`;
}

beforeEach(() => {
  clearConsentCookie();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getTrackingConsent", () => {
  it("defaults to granted until a banner ships and stores a decision", () => {
    expect(getTrackingConsent()).toBe("granted");
    expect(getStoredTrackingConsent()).toBeUndefined();
  });

  it("returns the stored decision", () => {
    document.cookie = `${TRACKING_CONSENT_COOKIE}=denied; path=/`;

    expect(getTrackingConsent()).toBe("denied");
    expect(getStoredTrackingConsent()).toBe("denied");
  });

  it.each([
    "yes",
    "true",
    "granted%22",
    "",
  ])("degrades a tampered cookie value (%j) to the default", (raw) => {
    document.cookie = `${TRACKING_CONSENT_COOKIE}=${raw}; path=/`;

    expect(getTrackingConsent()).toBe("granted");
    expect(getStoredTrackingConsent()).toBeUndefined();
  });

  it("returns the default when cookie access itself throws", () => {
    vi.spyOn(document, "cookie", "get").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(getTrackingConsent()).toBe("granted");
  });
});

describe("resolveTrackingConsent", () => {
  it("resolves the same values and default the client getters use — the server gate depends on this", () => {
    expect(resolveTrackingConsent("granted")).toBe("granted");
    expect(resolveTrackingConsent("denied")).toBe("denied");
    expect(resolveTrackingConsent(undefined)).toBe("granted");
    expect(resolveTrackingConsent("tampered")).toBe("granted");
  });
});

describe("setTrackingConsent", () => {
  it("persists the decision as a cookie so the server can honor it too", () => {
    setTrackingConsent("denied");

    expect(document.cookie).toContain(`${TRACKING_CONSENT_COOKIE}=denied`);
    expect(getTrackingConsent()).toBe("denied");
  });

  it("notifies subscribers with the new decision", () => {
    const listener = vi.fn();
    const unsubscribe = onTrackingConsentChange(listener);

    setTrackingConsent("denied");
    setTrackingConsent("granted");

    expect(listener).toHaveBeenNthCalledWith(1, "denied");
    expect(listener).toHaveBeenNthCalledWith(2, "granted");
    unsubscribe();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = onTrackingConsentChange(listener);

    unsubscribe();
    setTrackingConsent("denied");

    expect(listener).not.toHaveBeenCalled();
  });

  it("still notifies listeners when the cookie write fails — consent must apply to the live page", () => {
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {
      throw new Error("blocked");
    });
    const listener = vi.fn();
    const unsubscribe = onTrackingConsentChange(listener);

    expect(() => setTrackingConsent("denied")).not.toThrow();
    expect(listener).toHaveBeenCalledWith("denied");
    unsubscribe();
  });
});
