import { cn } from "@/lib/cn";

import { Input } from "./Input";

const BLOCKED_KEYS = new Set(["-", "+", "e", "E"]);

// Whole-number field: no spinner arrows, no negatives / exponent characters,
// and a length cap enforced on keystroke (browsers ignore the native maxLength
// on <input type="number">) — so the value is never mutated after the fact.
export function NumberInput({
  className,
  maxLength,
  onKeyDown,
  ...props
}: React.ComponentPropsWithRef<"input">) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      className={cn("no-spinner", className)}
      onKeyDown={(event) => {
        if (BLOCKED_KEYS.has(event.key)) {
          event.preventDefault();
        } else if (
          maxLength != null &&
          event.key.length === 1 &&
          !event.metaKey &&
          !event.ctrlKey &&
          event.currentTarget.value.length >= maxLength &&
          event.currentTarget.selectionStart ===
            event.currentTarget.selectionEnd
        ) {
          // At the cap with no selection to overwrite — drop the extra char.
          event.preventDefault();
        }
        onKeyDown?.(event);
      }}
      {...props}
    />
  );
}
