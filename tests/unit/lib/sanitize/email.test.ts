import { describe, expect, it } from "vitest";

import { cleanEmail } from "@/lib/sanitize/email";

describe("cleanEmail", () => {
  it("trims and lowercases", () => {
    expect(cleanEmail("  User@Example.COM  ")).toBe("user@example.com");
  });

  it("caps at 120 chars to match the DB column", () => {
    const local = "a".repeat(130);
    expect(cleanEmail(`${local}@x.co`)).toHaveLength(120);
  });

  it("leaves an already-clean email untouched", () => {
    expect(cleanEmail("user@example.com")).toBe("user@example.com");
  });
});
