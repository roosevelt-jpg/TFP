"use client";

import { AsYouType } from "libphonenumber-js/mobile";

import { Input } from "./Input";

type WhatsAppNumberFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
  previewName?: string;
};

export function WhatsAppNumberField({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  describedBy,
  previewName,
}: WhatsAppNumberFieldProps) {
  return (
    <div className="grid gap-2.5">
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+44 7700 900000"
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onBlur={onBlur}
        onChange={(e) => onChange(new AsYouType("GB").input(e.target.value))}
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
