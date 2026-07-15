import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  parsePosthogDistinctId,
  trackServerEvent,
} from "@/lib/analytics-server";
import { logger } from "@/lib/logger";
import { TRACKING_CONSENT_COOKIE } from "@/lib/tracking-consent";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    cookieGet: vi.fn<(name: string) => { value: string } | undefined>(),
    after: vi.fn<(cb: () => Promise<void>) => void>(),
    capture: vi.fn<(payload: unknown) => void>(),
    shutdown: vi.fn<() => Promise<void>>(),
    env: {
      NEXT_PUBLIC_POSTHOG_KEY: undefined as string | undefined,
      NEXT_PUBLIC_POSTHOG_HOST: undefined as string | undefined,
    },
  },
}));

vi.mock("@/env", () => ({ env: mocks.env }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookieGet }),
}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("posthog-node", () => ({
  PostHog: class {
    capture = mocks.capture;
    shutdown = mocks.shutdown;
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const PH_COOKIE = JSON.stringify({ distinct_id: "phc-anon-123" });

function stubCookies(values: Record<string, string>): void {
  mocks.cookieGet.mockImplementation((name) =>
    name in values ? { value: values[name] ?? "" } : undefined,
  );
}

async function flushAfter(): Promise<void> {
  for (const [cb] of mocks.after.mock.calls) await cb();
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
  mocks.env.NEXT_PUBLIC_POSTHOG_HOST = "https://hub.example.com";
  stubCookies({
    ph_phc_test_posthog: PH_COOKIE,
    [TRACKING_CONSENT_COOKIE]: "granted",
  });
  mocks.shutdown.mockResolvedValue(undefined);
});

describe("parsePosthogDistinctId", () => {
  it("reads distinct_id from plain JSON", () => {
    expect(parsePosthogDistinctId(PH_COOKIE)).toBe("phc-anon-123");
  });

  it("reads distinct_id from a URI-encoded cookie value", () => {
    expect(parsePosthogDistinctId(encodeURIComponent(PH_COOKIE))).toBe(
      "phc-anon-123",
    );
  });

  it.each([
    ["garbage", "not json"],
    ["missing field", '{"other":"x"}'],
    ["empty id", '{"distinct_id":""}'],
    ["non-string id", '{"distinct_id":42}'],
  ])("degrades %s to undefined", (_label, raw) => {
    expect(parsePosthogDistinctId(raw)).toBeUndefined();
  });
});

describe("trackServerEvent", () => {
  it("captures with the cookie's distinct_id and flushes", async () => {
    await trackServerEvent("lead_created", { source: "server" });
    await flushAfter();

    expect(mocks.capture).toHaveBeenCalledWith({
      distinctId: "phc-anon-123",
      event: "lead_created",
      properties: { source: "server" },
    });
    expect(mocks.shutdown).toHaveBeenCalledTimes(1);
  });

  it("falls back to a random distinct id when no posthog cookie exists", async () => {
    stubCookies({ [TRACKING_CONSENT_COOKIE]: "granted" });

    await trackServerEvent("lead_created", { source: "server" });
    await flushAfter();

    const call = mocks.capture.mock.calls[0]?.[0];
    expect(call).toMatchObject({ event: "lead_created" });
    expect(call).toHaveProperty("distinctId", expect.stringMatching(/\S+/));
  });

  it("warns when a posthog cookie exists but cannot be parsed", async () => {
    stubCookies({
      ph_phc_test_posthog: "not json",
      [TRACKING_CONSENT_COOKIE]: "granted",
    });

    await trackServerEvent("lead_created", { source: "server" });

    expect(logger.warn).toHaveBeenCalledWith(
      "PostHog cookie present but unparseable",
      { event: "lead_created" },
    );
    expect(mocks.after).toHaveBeenCalledTimes(1);
  });

  it("skips capture when no decision is stored — unanswered means denied now that the banner exists", async () => {
    stubCookies({ ph_phc_test_posthog: PH_COOKIE });

    await trackServerEvent("lead_created", { source: "server" });

    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.capture).not.toHaveBeenCalled();
  });

  it("honors a denied consent cookie — the server twin respects the same gate as the client", async () => {
    stubCookies({
      ph_phc_test_posthog: PH_COOKIE,
      [TRACKING_CONSENT_COOKIE]: "denied",
    });

    await trackServerEvent("lead_created", { source: "server" });

    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.capture).not.toHaveBeenCalled();
  });

  it("no-ops entirely when PostHog is not configured", async () => {
    mocks.env.NEXT_PUBLIC_POSTHOG_KEY = undefined;

    await trackServerEvent("lead_created", { source: "server" });

    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.capture).not.toHaveBeenCalled();
  });

  it("logs and swallows capture failures — tracking must never break a signup", async () => {
    mocks.capture.mockImplementation(() => {
      throw new Error("posthog down");
    });

    await trackServerEvent("lead_created", { source: "server" });
    await expect(flushAfter()).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      "PostHog server capture failed",
      expect.any(Error),
      { event: "lead_created" },
    );
  });

  it("logs and swallows setup failures (cookies unavailable) without rejecting", async () => {
    mocks.cookieGet.mockImplementation(() => {
      throw new Error("outside request scope");
    });

    await expect(
      trackServerEvent("lead_created", { source: "server" }),
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      "PostHog server capture setup failed",
      expect.any(Error),
      { event: "lead_created" },
    );
  });
});
