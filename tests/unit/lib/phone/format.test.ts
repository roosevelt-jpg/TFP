import { describe, expect, it } from "vitest";

import { parsePhoneInput } from "@/lib/phone/format";

describe("parsePhoneInput", () => {
  it("parses a typed GB mobile into national display and E.164", () => {
    expect(parsePhoneInput("GB", "07911 123456")).toEqual({
      display: "07911 123456",
      international: "+44 7911 123456",
      e164: "+447911123456",
      detectedCountry: "GB",
      valid: true,
    });
  });

  it("handles a pasted international number with a stray trunk zero — the launch-week bug", () => {
    // display pinned exactly: the bug was a doubled country code in the input.
    // `international` deliberately unpinned — metadata updates re-group it.
    expect(parsePhoneInput("GB", "+9710503266172")).toMatchObject({
      display: "050 326 6172",
      e164: "+971503266172",
      detectedCountry: "AE",
      valid: true,
    });
  });

  it("detects the country from a clean pasted international number", () => {
    const parsed = parsePhoneInput("GB", "+971503266172");

    expect(parsed.detectedCountry).toBe("AE");
    expect(parsed.e164).toBe("+971503266172");
    expect(parsed.valid).toBe(true);
  });

  it("marks partial input invalid so the form can't submit it", () => {
    expect(parsePhoneInput("GB", "0791").valid).toBe(false);
    expect(parsePhoneInput("GB", "+4479").valid).toBe(false);
  });

  it("parses for the selected country, not just GB", () => {
    expect(parsePhoneInput("US", "2135550123")).toMatchObject({
      e164: "+12135550123",
      detectedCountry: "US",
      valid: true,
    });
  });

  it("rejects a GB-shaped number under a US selection", () => {
    expect(parsePhoneInput("US", "07911123456").valid).toBe(false);
  });
});
