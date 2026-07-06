import { describe, expect, it } from "vitest";

import { firstNameOf } from "@/lib/name";

describe("firstNameOf", () => {
  it("takes the first word of a full name", () => {
    expect(firstNameOf("Jane Doe")).toBe("Jane");
  });

  it("trims before splitting", () => {
    expect(firstNameOf("  Jane Doe  ")).toBe("Jane");
  });

  it("returns the whole string for a single name", () => {
    expect(firstNameOf("Jane")).toBe("Jane");
  });

  it("returns an empty string when there's nothing usable", () => {
    expect(firstNameOf("   ")).toBe("");
  });
});
