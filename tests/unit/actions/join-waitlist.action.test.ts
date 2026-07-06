import { beforeEach, describe, expect, it, vi } from "vitest";

import { joinWaitlist } from "@/actions/join-waitlist.action";
import { logger } from "@/lib/logger";
import { CONSENT_TEXT, POLICY_VERSION } from "@/lib/waitlist/consent";
import type { UpsertResult } from "@/lib/waitlist/persist";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    checkRateLimit:
      vi.fn<() => Promise<{ success: boolean; retryAfter: number }>>(),
    clientIp: vi.fn<() => Promise<string | null>>(),
    verifyTurnstile: vi.fn<() => Promise<boolean>>(),
    upsertWaitlistLead:
      vi.fn<(details: unknown, createOnly: unknown) => Promise<UpsertResult>>(),
    trigger:
      vi.fn<
        (id: string, payload: unknown, opts: unknown) => Promise<unknown>
      >(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }));
vi.mock("@/lib/client-ip", () => ({ clientIp: mocks.clientIp }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: mocks.verifyTurnstile }));
vi.mock("@/lib/waitlist/persist", () => ({
  clientIp: mocks.clientIp,
  upsertWaitlistLead: mocks.upsertWaitlistLead,
}));
vi.mock("@trigger.dev/sdk", () => ({ tasks: { trigger: mocks.trigger } }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const validInput = {
  name: "  Jane   Doe  ",
  email: "Jane@Example.com",
  whatsapp: "07911 123456",
  goal: "lose",
  level: "beg",
  sex: "female",
  age: 28,
  heightCm: 165,
  weightKg: 60,
  consent: true,
  turnstileToken: "tok",
} as const;

const newLead: UpsertResult = {
  publicToken: "public-token",
  ref: "WL-TESTREF1",
  firstName: "Jane",
  isNew: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.checkRateLimit.mockResolvedValue({ success: true, retryAfter: 0 });
  mocks.clientIp.mockResolvedValue("1.2.3.4");
  mocks.verifyTurnstile.mockResolvedValue(true);
  mocks.upsertWaitlistLead.mockResolvedValue(newLead);
  mocks.trigger.mockResolvedValue({ id: "run_1" });
});

describe("joinWaitlist", () => {
  it("persists a sanitised lead and returns the public token", async () => {
    const result = await joinWaitlist(validInput);

    expect(result.data).toEqual({ ok: true, id: "public-token" });
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith(
      "tok",
      "1.2.3.4",
      "join",
    );

    const [details, createOnly] = mocks.upsertWaitlistLead.mock.calls[0] ?? [];
    expect(details).toMatchObject({
      name: "Jane Doe",
      email: "jane@example.com",
      whatsapp: "+447911123456",
      goalWeightKg: null,
      diet: null,
      injuries: null,
    });
    expect(createOnly).toMatchObject({
      consentText: CONSENT_TEXT,
      policyVersion: POLICY_VERSION,
      consentIp: "1.2.3.4",
      utmSource: null,
      referrer: null,
    });
  });

  it("enqueues both side effects exactly once, idempotent on the lead ref", async () => {
    await joinWaitlist(validInput);

    expect(mocks.trigger).toHaveBeenCalledTimes(2);
    expect(mocks.trigger).toHaveBeenNthCalledWith(
      1,
      "send-welcome-email",
      { email: "jane@example.com", firstName: "Jane", ref: "WL-TESTREF1" },
      { idempotencyKey: "WL-TESTREF1", idempotencyKeyTTL: "1h" },
    );
    expect(mocks.trigger).toHaveBeenNthCalledWith(
      2,
      "sync-ghl-contact",
      expect.objectContaining({
        email: "jane@example.com",
        phone: "+447911123456",
        ref: "WL-TESTREF1",
      }),
      { idempotencyKey: "WL-TESTREF1", idempotencyKeyTTL: "1h" },
    );
  });

  it("still succeeds when enqueueing fails — signups must never be lost to a Trigger outage", async () => {
    mocks.trigger.mockRejectedValue(new Error("trigger.dev unreachable"));

    const result = await joinWaitlist(validInput);

    expect(result.data).toEqual({ ok: true, id: "public-token" });
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to enqueue welcome email",
      expect.any(Error),
    );
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to enqueue GHL contact sync",
      expect.any(Error),
    );
  });

  it("re-fires nothing for a returning email", async () => {
    mocks.upsertWaitlistLead.mockResolvedValue({ ...newLead, isNew: false });

    const result = await joinWaitlist(validInput);

    expect(result.data).toEqual({ ok: true, id: "public-token" });
    expect(mocks.trigger).not.toHaveBeenCalled();
  });

  it("rejects a failed Turnstile check before touching the database", async () => {
    mocks.verifyTurnstile.mockResolvedValue(false);

    const result = await joinWaitlist(validInput);

    expect(result.validationErrors).toMatchObject({
      turnstileToken: {
        _errors: ["Verification failed. Please try again."],
      },
    });
    expect(mocks.upsertWaitlistLead).not.toHaveBeenCalled();
    expect(mocks.trigger).not.toHaveBeenCalled();
  });

  it("surfaces the rate-limit message and stops before any work", async () => {
    mocks.checkRateLimit.mockResolvedValue({ success: false, retryAfter: 30 });

    const result = await joinWaitlist(validInput);

    expect(result.serverError).toMatch(/Too many attempts/);
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
    expect(mocks.upsertWaitlistLead).not.toHaveBeenCalled();
  });

  it("stores first-touch attribution when the client captured one", async () => {
    await joinWaitlist({
      ...validInput,
      attribution: {
        utmSource: "instagram",
        utmCampaign: "launch",
        referrer: "https://l.instagram.com/",
        landingPath: "/join",
      },
    });

    const createOnly = mocks.upsertWaitlistLead.mock.calls[0]?.[1];
    expect(createOnly).toMatchObject({
      utmSource: "instagram",
      utmCampaign: "launch",
      utmMedium: null,
      referrer: "https://l.instagram.com/",
      landingPath: "/join",
    });
  });
});
