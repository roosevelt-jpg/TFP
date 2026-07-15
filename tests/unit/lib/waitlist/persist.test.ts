import { beforeEach, describe, expect, it, vi } from "vitest";

import { upsertWaitlistLead } from "@/lib/waitlist/persist";
import { Prisma } from "@/generated/prisma/client";

type UpsertArgs = {
  where: { email: string };
  create: { ref: string; publicToken: string };
  update: Record<string, unknown>;
};

type LeadRow = {
  publicToken: string;
  ref: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

const { upsertMock } = vi.hoisted(() => ({
  upsertMock: vi.fn<(args: UpsertArgs) => Promise<LeadRow>>(),
}));

vi.mock("@/db", () => ({ db: { waitlist: { upsert: upsertMock } } }));

function upsertArgs(call: number): UpsertArgs {
  const args = upsertMock.mock.calls[call]?.[0];
  if (!args) throw new Error(`upsert call ${call} was not recorded`);
  return args;
}

function p2002(target: unknown): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.8.0",
    meta: { target },
  });
}

// Distinct Date instances on purpose: isNew must compare timestamps, not
// references — real Prisma rows never share an instance.
function leadRow(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    publicToken: "public-token",
    ref: "WL-TESTREF1",
    name: "Jane Doe",
    createdAt: new Date("2026-07-06T12:00:00Z"),
    updatedAt: new Date("2026-07-06T12:00:00Z"),
    ...overrides,
  };
}

const details = {
  name: "Jane Doe",
  email: "jane@example.com",
  whatsapp: "+447911123456",
  goal: "lose",
  level: "beg",
  sex: "female",
  age: 28,
  heightCm: 165,
  weightKg: 60,
  goalWeightKg: null,
  diet: null,
  injuries: null,
} as const;

const createOnly = {
  consentAt: new Date("2026-07-06T12:00:00Z"),
  consentText: "consent",
  policyVersion: "2026-07-03",
  consentIp: "1.2.3.4",
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
  fbclid: null,
  gclid: null,
  referrer: null,
  landingPath: null,
  attributionCapturedAt: null,
};

beforeEach(() => {
  upsertMock.mockReset();
});

describe("upsertWaitlistLead", () => {
  it("marks a fresh insert as new and derives the first name", async () => {
    upsertMock.mockResolvedValueOnce(leadRow());

    const lead = await upsertWaitlistLead({ ...details }, { ...createOnly });

    expect(lead).toEqual({
      publicToken: "public-token",
      ref: "WL-TESTREF1",
      firstName: "Jane",
      isNew: true,
    });
    expect(upsertArgs(0).where).toEqual({ email: "jane@example.com" });
  });

  it("marks a returning email as not new so side effects don't re-fire", async () => {
    upsertMock.mockResolvedValueOnce(
      leadRow({ updatedAt: new Date("2026-07-06T13:00:00Z") }),
    );

    const lead = await upsertWaitlistLead({ ...details }, { ...createOnly });

    expect(lead.isNew).toBe(false);
  });

  it("retries a ref collision with freshly generated identifiers", async () => {
    upsertMock
      .mockRejectedValueOnce(p2002(["ref"]))
      .mockResolvedValueOnce(leadRow());

    await upsertWaitlistLead({ ...details }, { ...createOnly });

    expect(upsertMock).toHaveBeenCalledTimes(2);
    const first = upsertArgs(0).create;
    const second = upsertArgs(1).create;
    expect(second.ref).not.toBe(first.ref);
    expect(second.publicToken).not.toBe(first.publicToken);
  });

  it("retries when Prisma reports the collision target as a bare string", async () => {
    upsertMock
      .mockRejectedValueOnce(p2002("publicToken"))
      .mockResolvedValueOnce(leadRow());

    await upsertWaitlistLead({ ...details }, { ...createOnly });

    expect(upsertMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry an email conflict — upsert-by-email makes it impossible", async () => {
    upsertMock.mockRejectedValueOnce(p2002(["email"]));

    await expect(
      upsertWaitlistLead({ ...details }, { ...createOnly }),
    ).rejects.toMatchObject({ code: "P2002" });
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces non-collision errors immediately", async () => {
    upsertMock.mockRejectedValueOnce(new Error("connection pool timeout"));

    await expect(
      upsertWaitlistLead({ ...details }, { ...createOnly }),
    ).rejects.toThrow("connection pool timeout");
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after five consecutive collisions instead of looping", async () => {
    upsertMock.mockRejectedValue(p2002(["ref"]));

    await expect(
      upsertWaitlistLead({ ...details }, { ...createOnly }),
    ).rejects.toMatchObject({ code: "P2002" });
    expect(upsertMock).toHaveBeenCalledTimes(5);
  });
});
