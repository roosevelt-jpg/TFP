"use client";

import { useState } from "react";

import {
  type CountryCode,
  getCountryCallingCode,
} from "libphonenumber-js/mobile";

import { DEFAULT_COUNTRY } from "@/lib/phone/countries";
import { parsePhoneInput } from "@/lib/phone/format";

import { CountrySelect } from "./CountrySelect";
import { Input } from "./Input";

type WhatsAppNumberFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  previewName?: string;
  // Trails the number in the chat-bubble preview. Defaults to the waitlist's
  // wording; checkout passes its own, since by then there's no spot to wait for.
  previewSuffix?: string;
};

export function WhatsAppNumberField({
  id,
  value,
  onChange,
  onBlur,
  previewName,
  previewSuffix = "when your spot opens",
  ...aria
}: WhatsAppNumberFieldProps) {
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [text, setText] = useState("");
  const [lastValue, setLastValue] = useState("");

  if (value !== lastValue) {
    const external = parsePhoneInput(country, value);
    setText(external.display);
    if (external.detectedCountry) setCountry(external.detectedCountry);
    setLastValue(value);
  }

  const apply = (nextCountry: CountryCode, input: string) => {
    const parsed = parsePhoneInput(nextCountry, input);
    const follow =
      parsed.detectedCountry &&
      getCountryCallingCode(parsed.detectedCountry) !==
        getCountryCallingCode(nextCountry)
        ? parsed.detectedCountry
        : nextCountry;
    setText(parsed.display);
    setCountry(follow);
    setLastValue(parsed.e164);
    onChange(parsed.e164);
  };

  const preview = parsePhoneInput(country, text);

  return (
    <div className="grid gap-2.5">
      <div className="flex items-stretch gap-2">
        <CountrySelect
          value={country}
          onValueChange={(iso) => apply(iso, text)}
          aria-invalid={aria["aria-invalid"]}
        />
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={25}
          placeholder="7700 900000"
          value={text}
          onBlur={onBlur}
          onChange={(e) => apply(country, e.target.value)}
          {...aria}
        />
      </div>
      {preview.valid && (
        <div className="bg-(--chat-in) text-text w-fit max-w-full rounded-md rounded-tl-[3px] px-3 py-2 text-[0.8rem]">
          {previewName ? `${previewName}, I` : "I"}’ll text you at{" "}
          <b className="font-semibold">{preview.international}</b>{" "}
          {previewSuffix}.
        </div>
      )}
    </div>
  );
}
