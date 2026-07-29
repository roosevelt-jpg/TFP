import { describe, expect, it } from "vitest";

import { coachingFormSchema } from "@/lib/validation/coaching/schema";
import { waitlistFormSchema } from "@/lib/validation/waitlist/schema";

const EMPTY = {
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

const WAITLIST_EXTRAS = {
  name: "Kane Mousah",
  email: "buyer@example.com",
  whatsapp: "+447700900000",
  consent: true,
  turnstileToken: "token",
};

function errorFor(
  schema: typeof coachingFormSchema | typeof waitlistFormSchema,
  input: Record<string, unknown>,
  field: string,
): string {
  const result = schema.safeParse(input);
  if (result.success) return "OK";
  return (
    result.error.issues.find((issue) => issue.path[0] === field)?.message ??
    "OK"
  );
}

const REJECTED: [string, string, string][] = [
  ["age", "15", "You must be 16 or over to join"],
  ["age", "101", "That age looks too high"],
  ["age", "abc", "Age must be a number"],
  ["heightCm", "119", "Height looks too low"],
  ["heightCm", "273", "Height looks too high"],
  ["weightKg", "34", "Weight looks too low"],
  ["weightKg", "301", "Weight looks too high"],
  ["goalWeightKg", "34", "Goal weight looks too low"],
  ["goalWeightKg", "301", "Goal weight looks too high"],
  ["injuries", "x".repeat(301), "Keep it under 300 characters"],
  ["goal", "bogus", "Pick a goal"],
  ["level", "bogus", "Pick your experience level"],
  ["sex", "bogus", "Select one"],
];

describe("coachingFormSchema", () => {
  // Asked after payment: someone who has already paid must never be blocked by
  // this form, so an entirely empty submission is valid.
  it("accepts a completely empty submission", () => {
    expect(coachingFormSchema.safeParse(EMPTY).success).toBe(true);
  });

  it("accepts a fully answered submission", () => {
    const result = coachingFormSchema.safeParse({
      ...EMPTY,
      goal: "lose",
      level: "int",
      sex: "male",
      age: "28",
      heightCm: "180",
      weightKg: "78",
      goalWeightKg: "72",
      diet: "halal",
      injuries: "dodgy left shoulder",
    });

    expect(result.success).toBe(true);
  });

  describe("rejects out-of-range answers", () => {
    for (const [field, value, message] of REJECTED) {
      it(`${field}: ${value.slice(0, 12)}`, () => {
        expect(
          errorFor(coachingFormSchema, { ...EMPTY, [field]: value }, field),
        ).toBe(message);
      });
    }
  });

  // The schema composes waitlist/fields.ts rather than redeclaring ranges, and
  // this is what stops the two drifting apart.
  describe("message parity with the waitlist form", () => {
    for (const [field, value] of REJECTED) {
      it(`${field}: ${value.slice(0, 12)}`, () => {
        expect(
          errorFor(coachingFormSchema, { ...EMPTY, [field]: value }, field),
        ).toBe(
          errorFor(
            waitlistFormSchema,
            { ...EMPTY, ...WAITLIST_EXTRAS, [field]: value },
            field,
          ),
        );
      });
    }
  });

  // Boundaries: the values a real customer plausibly enters.
  describe("accepts the edges of each range", () => {
    const EDGES: [string, string][] = [
      ["age", "16"],
      ["age", "100"],
      ["heightCm", "120"],
      ["heightCm", "272"],
      ["weightKg", "35"],
      ["weightKg", "300"],
      ["goalWeightKg", "35"],
    ];

    for (const [field, value] of EDGES) {
      it(`${field} = ${value}`, () => {
        expect(
          coachingFormSchema.safeParse({ ...EMPTY, [field]: value }).success,
        ).toBe(true);
      });
    }
  });
});
