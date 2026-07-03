import { parsePhoneNumberFromString } from "libphonenumber-js/mobile";

// Non-throwing parse (returns undefined on garbage) → E.164, or null.
export function toE164(value: string): string | null {
  return parsePhoneNumberFromString(value, "GB")?.number ?? null;
}
