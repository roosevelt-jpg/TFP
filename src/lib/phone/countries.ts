import {
  type CountryCode,
  getCountries,
  getCountryCallingCode,
} from "libphonenumber-js/mobile";

export type Country = {
  iso: CountryCode;
  name: string;
  callingCode: string;
  flag: string;
};

// ISO-3166 alpha-2 → regional-indicator flag emoji.
function toFlag(iso: string): string {
  return iso.replace(/./g, (c) =>
    String.fromCodePoint(127397 + c.charCodeAt(0)),
  );
}

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

export const COUNTRIES: Country[] = getCountries()
  .map((iso) => ({
    iso,
    name: displayNames.of(iso) ?? iso,
    callingCode: getCountryCallingCode(iso),
    flag: toFlag(iso),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const BY_ISO = new Map(COUNTRIES.map((c) => [c.iso, c]));

export function getCountry(iso: CountryCode): Country | undefined {
  return BY_ISO.get(iso);
}

export const DEFAULT_COUNTRY: CountryCode = "GB";
