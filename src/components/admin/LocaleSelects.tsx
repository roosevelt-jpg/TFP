"use client";

import {
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE,
  LANGUAGE_OPTIONS,
  coerceCurrencyCode,
  coerceLanguageCode,
  type CurrencyCode,
  type LanguageCode,
} from "@/lib/i18n/catalog";

type SelectProps = {
  id?: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

/** Admin language dropdown — Meta / WhatsApp codes only. */
export function LanguageSelect({
  id,
  name,
  defaultValue,
  required,
  disabled,
  className,
}: SelectProps) {
  const value: LanguageCode = coerceLanguageCode(defaultValue);
  return (
    <select
      id={id}
      name={name}
      defaultValue={value}
      required={required}
      disabled={disabled}
      className={className}
    >
      {LANGUAGE_OPTIONS.map((opt) => (
        <option key={opt.code} value={opt.code}>
          {opt.label} ({opt.code})
        </option>
      ))}
    </select>
  );
}

/** Admin currency dropdown — ISO 4217 only. */
export function CurrencySelect({
  id,
  name,
  defaultValue,
  required,
  disabled,
  className,
}: SelectProps) {
  const value: CurrencyCode = coerceCurrencyCode(defaultValue);
  return (
    <select
      id={id}
      name={name}
      defaultValue={value}
      required={required}
      disabled={disabled}
      className={className}
    >
      {CURRENCY_OPTIONS.map((opt) => (
        <option key={opt.code} value={opt.code}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export { DEFAULT_CURRENCY, DEFAULT_LANGUAGE };
