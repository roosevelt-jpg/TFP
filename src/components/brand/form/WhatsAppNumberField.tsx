"use client";

import { AsYouType } from "libphonenumber-js/mobile";

import { Input } from "./Input";

type WhatsAppNumberFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  previewName?: string;
};

export function WhatsAppNumberField({
  id,
  value,
  onChange,
  onBlur,
  previewName,
  ...aria
}: WhatsAppNumberFieldProps) {
  return (
    <div className="grid gap-2.5">
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        maxLength={25}
        placeholder="+44 7700 900000"
        value={value}
        onBlur={onBlur}
        onChange={(e) =>
          onChange(new AsYouType("GB").input(e.target.value.slice(0, 20)))
        }
        {...aria}
      />
      {value.length > 4 && (
        <div className="bg-(--chat-in) text-text w-fit max-w-full rounded-md rounded-tl-[3px] px-3 py-2 text-[0.8rem]">
          {previewName ? `${previewName}, I` : "I"}’ll text you at{" "}
          <b className="font-semibold">{value}</b> when your spot opens.
        </div>
      )}
    </div>
  );
}
