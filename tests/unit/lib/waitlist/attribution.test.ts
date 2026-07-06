// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { captureAttribution, getAttribution } from "@/lib/waitlist/attribution";

const STORAGE_KEY = "tfp_attribution";

function visit(path: string, referrer = ""): void {
  window.history.replaceState(null, "", path);
  Object.defineProperty(document, "referrer", {
    value: referrer,
    configurable: true,
  });
}

function stored(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

beforeEach(() => {
  localStorage.clear();
  visit("/");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("captureAttribution", () => {
  it("stores the first touch with UTMs, referrer, and landing path", () => {
    visit(
      "/join?utm_source=instagram&utm_campaign=launch&fbclid=abc123",
      "https://l.instagram.com/",
    );

    captureAttribution();

    expect(JSON.parse(stored() ?? "{}")).toEqual({
      utmSource: "instagram",
      utmCampaign: "launch",
      fbclid: "abc123",
      referrer: "https://l.instagram.com/",
      landingPath: "/join",
    });
  });

  it("never overwrites the first touch — attribution belongs to the first campaign", () => {
    visit("/?utm_source=instagram");
    captureAttribution();

    visit("/?utm_source=tiktok");
    captureAttribution();

    expect(JSON.parse(stored() ?? "{}").utmSource).toBe("instagram");
  });

  it("stores nothing for an organic visit with no signal", () => {
    visit("/join");

    captureAttribution();

    expect(stored()).toBeNull();
  });

  it("ignores same-origin referrers so internal navigation isn't attribution", () => {
    visit("/?utm_source=instagram", `${window.location.origin}/other-page`);

    captureAttribution();

    const parsed = JSON.parse(stored() ?? "{}");
    expect(parsed.utmSource).toBe("instagram");
    expect(parsed).not.toHaveProperty("referrer");
  });

  it("truncates oversized parameter values", () => {
    visit(`/?utm_source=${"x".repeat(400)}`);

    captureAttribution();

    expect(JSON.parse(stored() ?? "{}").utmSource).toHaveLength(300);
  });

  it("swallows storage failures — attribution must never break the page", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(() => captureAttribution()).not.toThrow();
  });
});

describe("getAttribution", () => {
  it("returns the stored first touch", () => {
    visit("/?utm_source=instagram");
    captureAttribution();

    expect(getAttribution()).toMatchObject({ utmSource: "instagram" });
  });

  it("returns undefined when nothing is stored", () => {
    expect(getAttribution()).toBeUndefined();
  });

  it.each([
    ["garbage", "not json"],
    ["a JSON null", "null"],
    ["a JSON array", '["tampered"]'],
  ])("degrades %s to undefined instead of failing the signup", (_label, raw) => {
    localStorage.setItem(STORAGE_KEY, raw);

    expect(getAttribution()).toBeUndefined();
  });

  it("returns undefined when localStorage itself throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("private mode");
    });

    expect(getAttribution()).toBeUndefined();
  });
});
