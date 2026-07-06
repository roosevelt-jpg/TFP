import { describe, expect, it } from "vitest";

import { generatePublicToken, generateRef } from "@/lib/waitlist/ref";

describe("generateRef", () => {
  it("produces WL- refs from the Crockford alphabet (no I, L, O, U)", () => {
    for (let i = 0; i < 100; i++) {
      expect(generateRef()).toMatch(/^WL-[0-9A-HJKMNP-TV-Z]{8}$/);
    }
  });

  it("varies across calls", () => {
    const refs = new Set(Array.from({ length: 100 }, generateRef));

    expect(refs.size).toBe(100);
  });
});

describe("generatePublicToken", () => {
  it("produces 32-char unpadded base64url tokens", () => {
    for (let i = 0; i < 100; i++) {
      expect(generatePublicToken()).toMatch(/^[A-Za-z0-9_-]{32}$/);
    }
  });

  it("varies across calls", () => {
    const tokens = new Set(Array.from({ length: 100 }, generatePublicToken));

    expect(tokens.size).toBe(100);
  });
});
