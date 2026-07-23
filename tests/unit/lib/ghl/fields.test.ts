import { describe, expect, it } from "vitest";

import { toGhlCustomFields } from "@/lib/ghl/fields";

const profile = {
  goal: "lose",
  level: "beg",
  sex: "female",
  age: 28,
  heightCm: 165,
  weightKg: 60,
};

function values(p: Parameters<typeof toGhlCustomFields>[0]): string[] {
  return toGhlCustomFields(p).map((f) => f.field_value);
}

describe("toGhlCustomFields", () => {
  it("sends human labels for the dropdowns and strings for the numbers", () => {
    expect(values(profile)).toEqual([
      "Lose fat",
      "Beginner",
      "Female",
      "28",
      "165",
      "60",
    ]);
  });

  it("assigns every field a stable GHL field id", () => {
    const fields = toGhlCustomFields(profile);

    expect(new Set(fields.map((f) => f.id)).size).toBe(fields.length);
    for (const field of fields) {
      expect(field.id).toMatch(/^[A-Za-z0-9]{20}$/);
    }
  });

  it("omits optional fields when absent so GHL never gets empty values", () => {
    expect(values({ ...profile, goalWeightKg: null })).toHaveLength(6);
    expect(values({ ...profile, diet: null, injuries: null })).toHaveLength(6);
  });

  it("returns nothing for an empty profile (minimal lead)", () => {
    expect(toGhlCustomFields({})).toEqual([]);
  });

  it("sends only the fields the lead provided", () => {
    expect(values({ goal: "lose" })).toEqual(["Lose fat"]);
    expect(values({ age: 30 })).toEqual(["30"]);
  });

  it("omits a nulled-out number without coercing it to a string", () => {
    expect(values({ ...profile, age: null })).not.toContain("null");
    expect(values({ ...profile, age: null })).toHaveLength(5);
  });

  it("includes optional fields when present", () => {
    expect(
      values({ ...profile, goalWeightKg: 55, injuries: "Bad knee" }),
    ).toEqual([
      "Lose fat",
      "Beginner",
      "Female",
      "28",
      "165",
      "60",
      "55",
      "Bad knee",
    ]);
  });

  it("sends the raw diet value (current behaviour — GHL dropdown must match values, not labels)", () => {
    expect(values({ ...profile, diet: "vegetarian" })).toContain("vegetarian");
    expect(values({ ...profile, diet: "vegetarian" })).not.toContain(
      "Vegetarian",
    );
  });

  it("falls back to the raw value for an unknown option", () => {
    expect(values({ ...profile, goal: "shred" })).toContain("shred");
  });
});
