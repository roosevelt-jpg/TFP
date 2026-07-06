import { describe, expect, it } from "vitest";

import { toE164 } from "@/lib/sanitize/phone";

describe("toE164", () => {
  it("converts a GB national mobile to E.164", () => {
    expect(toE164("07911 123456")).toBe("+447911123456");
  });

  it("passes an already-international number through", () => {
    expect(toE164("+447911123456")).toBe("+447911123456");
  });

  it("returns null for garbage instead of throwing", () => {
    expect(toE164("hello")).toBeNull();
    expect(toE164("")).toBeNull();
  });

  it("formats parseable non-mobiles too — the mobile-only gate is the schema's job", () => {
    expect(toE164("020 7946 0958")).toBe("+442079460958");
  });
});
