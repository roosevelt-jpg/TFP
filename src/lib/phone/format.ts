import { AsYouType, type CountryCode } from "libphonenumber-js/mobile";

export type PhoneParse = {
  display: string;
  international: string;
  e164: string;
  detectedCountry: CountryCode | undefined;
  valid: boolean;
};

// AsYouType handles pasted "+<intl>" numbers and trunk-prefix zeros, so callers
// get a clean E.164 without hand-rolling country-code prefixing.
export function parsePhoneInput(
  country: CountryCode,
  input: string,
): PhoneParse {
  const ayt = new AsYouType(country);
  const raw = ayt.input(input);
  const number = ayt.getNumber();
  const national = number?.format("NATIONAL");
  return {
    display: national ?? stripCallingCode(raw),
    international: number?.format("INTERNATIONAL") ?? raw,
    e164: number?.number ?? "",
    detectedCountry: ayt.getCountry(),
    valid: number?.isValid() ?? false,
  };
}

// While a number is still incomplete, drop any leading "+<code>" the user
// pasted so the input shows only the national part.
function stripCallingCode(display: string): string {
  return display.replace(/^\+\d+\s*/, "");
}
