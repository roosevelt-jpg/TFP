import { describe, expect, it } from "vitest";

import { COUNTRIES, DEFAULT_COUNTRY, getCountry } from "@/lib/phone/countries";

// Invariants only — never snapshot the list: ICU updates can rename regions
// between Node versions and would rot exact-list assertions.
describe("COUNTRIES", () => {
  it("contains GB with its calling code and flag", () => {
    const gb = getCountry("GB");

    expect(gb).toEqual({
      iso: "GB",
      name: "United Kingdom",
      callingCode: "44",
      flag: "🇬🇧",
    });
  });

  it("is sorted by localized name for the selector", () => {
    const names = COUNTRIES.map((c) => c.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));

    expect(names).toEqual(sorted);
  });

  it("has unique ISO codes and complete entries", () => {
    expect(new Set(COUNTRIES.map((c) => c.iso)).size).toBe(COUNTRIES.length);
    for (const country of COUNTRIES) {
      expect(country.name).not.toBe("");
      expect(country.callingCode).toMatch(/^\d+$/);
      expect(country.flag).toHaveLength(4);
    }
  });

  it("defaults the selector to GB", () => {
    expect(DEFAULT_COUNTRY).toBe("GB");
  });
});
