import { parsePhoneNumberFromString } from "libphonenumber-js/mobile";

// Non-throwing parse (returns undefined on garbage) → E.164, or null.
// Formats without judging: it will happily render a landline, or turn "12" into
// "+4412". Mobile-only enforcement is the schema's job, before this runs.
export function toE164(value: string): string | null {
  return parsePhoneNumberFromString(value, "GB")?.number ?? null;
}
