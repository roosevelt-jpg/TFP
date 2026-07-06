"use client";

import { Combobox } from "@base-ui/react/combobox";
import type { CountryCode } from "libphonenumber-js/mobile";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react";

import { cn } from "@/lib/cn";
import { COUNTRIES, type Country, getCountry } from "@/lib/phone/countries";

type CountrySelectProps = {
  value: CountryCode;
  onValueChange: (iso: CountryCode) => void;
  disabled?: boolean;
  "aria-invalid"?: true;
};

export function CountrySelect({
  value,
  onValueChange,
  disabled,
  "aria-invalid": ariaInvalid,
}: CountrySelectProps) {
  const selected = getCountry(value);

  return (
    <Combobox.Root
      items={COUNTRIES}
      value={selected}
      onValueChange={(country: Country | null) => {
        if (country) onValueChange(country.iso);
      }}
      itemToStringValue={(c: Country) => `${c.name} +${c.callingCode} ${c.iso}`}
      disabled={disabled}
    >
      <Combobox.Trigger
        aria-label="Country code"
        aria-invalid={ariaInvalid}
        className={cn(
          "bg-bg-2 border-hairline-strong text-text flex h-full min-h-[52px] items-center gap-1.5 rounded-xs border px-3 leading-[1.3] outline-none select-none",
          "transition-[border-color,box-shadow] focus-visible:border-red focus-visible:shadow-[0_0_0_3px_var(--ring)] data-popup-open:border-red",
          "aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className="text-[1.15rem] leading-none">{selected?.flag}</span>
        <span className="text-text text-[0.95rem]">
          +{selected?.callingCode}
        </span>
        <ChevronDownIcon className="text-dim size-4 shrink-0" />
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Positioner
          sideOffset={6}
          align="start"
          className="isolate z-50"
        >
          <Combobox.Popup
            className={cn(
              "bg-surface border-hairline-strong text-text shadow-card z-50 w-[min(20rem,var(--available-width))] origin-(--transform-origin) overflow-hidden rounded-xs border duration-100",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <div className="border-hairline flex items-center gap-2 border-b px-3 py-2.5">
              <SearchIcon className="text-dim size-4 shrink-0" />
              <Combobox.Input
                placeholder="Search countries"
                className="text-text placeholder:text-dim w-full bg-transparent text-[0.95rem] outline-none"
              />
            </div>

            <Combobox.Empty className="text-dim px-3 py-6 text-center text-[0.9rem]">
              No country found.
            </Combobox.Empty>

            <Combobox.List className="max-h-64 overflow-y-auto p-1">
              {(country: Country) => (
                <Combobox.Item
                  key={country.iso}
                  value={country}
                  className={cn(
                    "text-muted data-highlighted:bg-surface-2 data-highlighted:text-text data-selected:text-text relative flex w-full cursor-pointer items-center gap-2.5 rounded-xs py-2 pr-8 pl-2.5 text-[0.95rem] outline-hidden select-none",
                  )}
                >
                  <span className="text-[1.05rem] leading-none">
                    {country.flag}
                  </span>
                  <span className="flex-1 truncate">{country.name}</span>
                  <span className="text-dim">+{country.callingCode}</span>
                  <Combobox.ItemIndicator className="text-red absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
