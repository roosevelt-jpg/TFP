import { describe, expect, it } from "vitest";
import type * as z from "zod";

import {
  waitlistFormSchema,
  waitlistSchema,
} from "@/lib/validation/waitlist/schema";

// The minimal required set after the friction-reduction change.
const minimalServerInput = {
  name: "Jane Doe",
  email: "jane@example.com",
  whatsapp: "07911 123456",
  consent: true,
  turnstileToken: "tok",
};

const serverInput = {
  ...minimalServerInput,
  goal: "lose",
  level: "beg",
  sex: "female",
  age: 28,
  heightCm: 165,
  weightKg: 60,
};

// Form variant of the minimal set: the demoted profile fields arrive as empty
// controlled strings and must coerce to undefined.
const minimalFormInput = {
  ...minimalServerInput,
  goal: "",
  level: "",
  sex: "",
  age: "",
  heightCm: "",
  weightKg: "",
  goalWeightKg: "",
  diet: "",
  injuries: "",
};

const formInput = {
  ...minimalFormInput,
  goal: "lose",
  level: "beg",
  sex: "female",
  age: "28",
  heightCm: "165",
  weightKg: "60",
};

function firstIssue(result: z.ZodSafeParseResult<unknown>): string {
  return result.error?.issues[0]?.message ?? "";
}

describe("waitlistFormSchema (client)", () => {
  it("coerces the controlled string fields into domain numbers", () => {
    const result = waitlistFormSchema.safeParse(formInput);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      age: 28,
      heightCm: 165,
      weightKg: 60,
      goalWeightKg: undefined,
      diet: undefined,
    });
  });

  it("accepts the minimal form (demoted profile fields empty → undefined)", () => {
    const result = waitlistFormSchema.safeParse(minimalFormInput);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      goal: undefined,
      level: undefined,
      sex: undefined,
      age: undefined,
      heightCm: undefined,
      weightKg: undefined,
    });
  });

  it.each([
    ["age", "15", "You must be 16 or over to join"],
    ["age", "101", "That age looks too high"],
    ["age", "28.5", "Age must be a whole number"],
    ["heightCm", "119", "Height looks too low"],
    ["heightCm", "273", "Height looks too high"],
    ["weightKg", "34", "Weight looks too low"],
    ["weightKg", "301", "Weight looks too high"],
    ["goalWeightKg", "34", "Goal weight looks too low"],
  ])("rejects %s=%s (%s)", (field, value, message) => {
    const result = waitlistFormSchema.safeParse({
      ...formInput,
      [field]: value,
    });

    expect(result.success).toBe(false);
    expect(firstIssue(result)).toBe(message);
  });

  it.each(["16", "100"])("accepts the age boundary %s", (age) => {
    expect(waitlistFormSchema.safeParse({ ...formInput, age }).success).toBe(
      true,
    );
  });

  it("requires explicit consent", () => {
    const result = waitlistFormSchema.safeParse({
      ...formInput,
      consent: false,
    });

    expect(result.success).toBe(false);
    expect(firstIssue(result)).toBe("You must agree to continue");
  });
});

describe("waitlistSchema (server)", () => {
  it("accepts already-coerced input", () => {
    expect(waitlistSchema.safeParse(serverInput).success).toBe(true);
  });

  it("accepts the minimal set with profile fields absent", () => {
    const result = waitlistSchema.safeParse(minimalServerInput);

    expect(result.success).toBe(true);
    expect(result.data?.goal).toBeUndefined();
    expect(result.data?.age).toBeUndefined();
  });

  it("still rejects a provided-but-invalid enum", () => {
    const result = waitlistSchema.safeParse({ ...serverInput, goal: "shred" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["goal"]);
  });

  it("rejects string numbers — proof the form/server variants aren't swapped", () => {
    const result = waitlistSchema.safeParse({ ...serverInput, age: "28" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["age"]);
  });

  it("rejects consent=false at the type level", () => {
    expect(
      waitlistSchema.safeParse({ ...serverInput, consent: false }).success,
    ).toBe(false);
  });
});

describe("shared field rules", () => {
  it("trims the email and rejects invalid or oversized ones", () => {
    const trimmed = waitlistSchema.safeParse({
      ...serverInput,
      email: "  jane@example.com  ",
    });
    expect(trimmed.success).toBe(true);
    expect(trimmed.data?.email).toBe("jane@example.com");

    expect(
      waitlistSchema.safeParse({ ...serverInput, email: "not-an-email" })
        .success,
    ).toBe(false);
    expect(
      waitlistSchema.safeParse({
        ...serverInput,
        email: `${"a".repeat(120)}@x.co`,
      }).success,
    ).toBe(false);
  });

  it.each([
    "07911 123456",
    "+447911123456",
    "07400 123456",
  ])("accepts the GB mobile %s", (whatsapp) => {
    expect(waitlistSchema.safeParse({ ...serverInput, whatsapp }).success).toBe(
      true,
    );
  });

  it.each([
    ["a GB landline", "020 7946 0958"],
    ["garbage", "not a number"],
    ["a too-short number", "0770"],
  ])("rejects %s — WhatsApp needs a mobile", (_label, whatsapp) => {
    const result = waitlistSchema.safeParse({ ...serverInput, whatsapp });

    expect(result.success).toBe(false);
    expect(firstIssue(result)).toBe("Enter a valid mobile number");
  });

  it("rejects names that are too short or too long", () => {
    expect(
      waitlistSchema.safeParse({ ...serverInput, name: "J" }).success,
    ).toBe(false);
    expect(
      waitlistSchema.safeParse({ ...serverInput, name: "J".repeat(81) })
        .success,
    ).toBe(false);
  });

  it("rejects an unknown diet value", () => {
    expect(
      waitlistSchema.safeParse({ ...serverInput, diet: "carnivore" }).success,
    ).toBe(false);
  });

  it("caps attacker-controlled attribution lengths", () => {
    const okAttribution = waitlistSchema.safeParse({
      ...serverInput,
      attribution: { utmSource: "instagram", referrer: "https://l.example" },
    });
    expect(okAttribution.success).toBe(true);

    expect(
      waitlistSchema.safeParse({
        ...serverInput,
        attribution: { utmSource: "x".repeat(301) },
      }).success,
    ).toBe(false);
    expect(
      waitlistSchema.safeParse({
        ...serverInput,
        attribution: { referrer: "x".repeat(1001) },
      }).success,
    ).toBe(false);
  });

  it("requires a Turnstile token before the network verify", () => {
    const result = waitlistSchema.safeParse({
      ...serverInput,
      turnstileToken: "",
    });

    expect(result.success).toBe(false);
    expect(firstIssue(result)).toBe("Please complete the verification");
  });
});
