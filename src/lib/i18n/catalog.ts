/**
 * Shared language + currency catalogs for admin config.
 * Use the Select components — never free-text codes.
 */

export const LANGUAGE_OPTIONS = [
  { code: "en_GB", label: "English (UK)" },
  { code: "en_US", label: "English (US)" },
  { code: "en", label: "English (generic)" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "es_ES", label: "Spanish (Spain)" },
  { code: "es_MX", label: "Spanish (Mexico)" },
  { code: "it", label: "Italian" },
  { code: "nl", label: "Dutch" },
  { code: "pt_BR", label: "Portuguese (Brazil)" },
  { code: "pt_PT", label: "Portuguese (Portugal)" },
  { code: "tr", label: "Turkish" },
  { code: "hi", label: "Hindi" },
  { code: "id", label: "Indonesian" },
  { code: "ru", label: "Russian" },
  { code: "zh_CN", label: "Chinese (Simplified)" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
] as const;

export type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]["code"];

export const LANGUAGE_CODES = LANGUAGE_OPTIONS.map((o) => o.code) as [
  LanguageCode,
  ...LanguageCode[],
];

export const DEFAULT_LANGUAGE: LanguageCode = "en_GB";

export function isLanguageCode(value: string): value is LanguageCode {
  return (LANGUAGE_CODES as readonly string[]).includes(value);
}

export function coerceLanguageCode(value: string | null | undefined): LanguageCode {
  if (value && isLanguageCode(value)) return value;
  return DEFAULT_LANGUAGE;
}

/** ISO 4217 — keep aligned with finance CSV + Revolut accounts. */
export const CURRENCY_OPTIONS = [
  { code: "GBP", label: "GBP — British Pound (£)" },
  { code: "AED", label: "AED — UAE Dirham (د.إ)" },
  { code: "EUR", label: "EUR — Euro (€)" },
  { code: "USD", label: "USD — US Dollar ($)" },
  { code: "AUD", label: "AUD — Australian Dollar (A$)" },
  { code: "CAD", label: "CAD — Canadian Dollar (C$)" },
] as const;

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]["code"];

export const CURRENCY_CODES = CURRENCY_OPTIONS.map((o) => o.code) as [
  CurrencyCode,
  ...CurrencyCode[],
];

export const DEFAULT_CURRENCY: CurrencyCode = "GBP";

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (CURRENCY_CODES as readonly string[]).includes(value.toUpperCase());
}

export function coerceCurrencyCode(
  value: string | null | undefined,
): CurrencyCode {
  const upper = value?.trim().toUpperCase() ?? "";
  if (isCurrencyCode(upper)) return upper;
  return DEFAULT_CURRENCY;
}
