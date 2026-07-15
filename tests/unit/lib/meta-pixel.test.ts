// @vitest-environment jsdom

/** biome-ignore-all lint/suspicious/noDocumentCookie: tests drive the consent cookie directly (see the rationale in tracking-consent.ts). */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    env: { NEXT_PUBLIC_META_PIXEL_ID: undefined as string | undefined },
  },
}));

vi.mock("@/env", () => ({ env: mocks.env }));

type FbqCall = unknown[];

function windowFbq(): { (...args: unknown[]): void; queue: FbqCall[] } {
  const fbq = Reflect.get(window, "fbq");
  if (typeof fbq !== "function") throw new Error("fbq not installed");
  return fbq;
}

async function importModule() {
  return import("@/lib/meta-pixel");
}

beforeEach(() => {
  vi.resetModules();
  Reflect.deleteProperty(window, "fbq");
  Reflect.deleteProperty(window, "_fbq");
  document.head.innerHTML = "";
  document.cookie = "tfp_tracking_consent=; path=/; max-age=0";
  mocks.env.NEXT_PUBLIC_META_PIXEL_ID = "1234567890";
});

describe("loadMetaPixel", () => {
  it("no-ops without a pixel id — no stub, no script", async () => {
    mocks.env.NEXT_PUBLIC_META_PIXEL_ID = undefined;
    const { loadMetaPixel } = await importModule();

    loadMetaPixel();

    expect(Reflect.get(window, "fbq")).toBeUndefined();
    expect(document.querySelector("script")).toBeNull();
  });

  it("installs the stub, queues init + PageView, and injects fbevents.js", async () => {
    const { loadMetaPixel } = await importModule();

    loadMetaPixel();

    expect(windowFbq().queue).toEqual([
      ["init", "1234567890"],
      ["track", "PageView"],
    ]);
    const script = document.querySelector("script");
    expect(script?.src).toBe("https://connect.facebook.net/en_US/fbevents.js");
    expect(script?.async).toBe(true);
  });

  it("revokes before init and queues NO PageView when the gate is denied — a later grant flushes the queue, so denial-window events must never enter it", async () => {
    document.cookie = "tfp_tracking_consent=denied; path=/";
    const { loadMetaPixel } = await importModule();

    loadMetaPixel();

    expect(windowFbq().queue).toEqual([
      ["consent", "revoke"],
      ["init", "1234567890"],
    ]);
  });

  it("fires a fresh post-consent PageView on grant instead of releasing stale ones", async () => {
    document.cookie = "tfp_tracking_consent=denied; path=/";
    const { loadMetaPixel } = await importModule();
    const { setTrackingConsent } = await import("@/lib/tracking-consent");

    loadMetaPixel();
    setTrackingConsent("granted");

    expect(windowFbq().queue.slice(-2)).toEqual([
      ["consent", "grant"],
      ["track", "PageView"],
    ]);
  });

  it("queues revoke when consent is withdrawn", async () => {
    const { loadMetaPixel } = await importModule();
    const { setTrackingConsent } = await import("@/lib/tracking-consent");

    loadMetaPixel();
    setTrackingConsent("denied");

    expect(windowFbq().queue.at(-1)).toEqual(["consent", "revoke"]);
  });

  it("adopts a pre-existing window.fbq instead of clobbering it (official snippet's f.fbq guard)", async () => {
    const calls: unknown[][] = [];
    Reflect.set(window, "fbq", (...args: unknown[]) => {
      calls.push(args);
    });
    const { loadMetaPixel, trackLead } = await importModule();

    loadMetaPixel();
    trackLead("tok");

    expect(document.querySelector("script")).toBeNull();
    expect(calls).toContainEqual(["init", "1234567890"]);
    expect(calls.at(-1)).toEqual(["track", "Lead", {}, { eventID: "tok" }]);
  });

  it("is idempotent — a second call adds nothing", async () => {
    const { loadMetaPixel } = await importModule();

    loadMetaPixel();
    loadMetaPixel();

    expect(document.querySelectorAll("script")).toHaveLength(1);
    expect(windowFbq().queue).toHaveLength(2);
  });
});

describe("trackLead", () => {
  it("queues Lead with the eventID needed for Conversions API dedup", async () => {
    const { loadMetaPixel, trackLead } = await importModule();

    loadMetaPixel();
    trackLead("public-token-1");

    expect(windowFbq().queue.at(-1)).toEqual([
      "track",
      "Lead",
      {},
      { eventID: "public-token-1" },
    ]);
  });

  it("is a silent no-op before the pixel loads", async () => {
    const { trackLead } = await importModule();

    expect(() => trackLead("public-token-1")).not.toThrow();
    expect(Reflect.get(window, "fbq")).toBeUndefined();
  });

  it("does not queue a Lead while consent is denied", async () => {
    document.cookie = "tfp_tracking_consent=denied; path=/";
    const { loadMetaPixel, trackLead } = await importModule();

    loadMetaPixel();
    trackLead("public-token-1");

    expect(windowFbq().queue.filter((c) => c[1] === "Lead")).toHaveLength(0);
  });
});

describe("trackPixelPageView", () => {
  it("queues an additional PageView for soft navigations", async () => {
    const { loadMetaPixel, trackPixelPageView } = await importModule();

    loadMetaPixel();
    trackPixelPageView();

    expect(windowFbq().queue.filter((c) => c[1] === "PageView")).toHaveLength(
      2,
    );
  });
});
