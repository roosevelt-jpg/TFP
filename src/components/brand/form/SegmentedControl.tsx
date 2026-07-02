import { cn } from "@/lib/cn";

type SegmentedControlProps = {
  name: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
};

// Native radios (visually hidden) with styled labels: full keyboard/AT support
// for free, and no role overrides.
export function SegmentedControl({
  name,
  options,
  value,
  onChange,
  onBlur,
  invalid,
  describedBy,
}: SegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className="grid grid-cols-3 gap-2"
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <label
            key={o.value}
            className={cn(
              "cursor-pointer rounded-sm border px-3 py-2.5 text-center text-[0.9rem] transition-colors",
              "has-focus-visible:ring-2 has-focus-visible:ring-ring",
              selected
                ? "border-red bg-red/10 text-text"
                : "border-hairline-strong text-muted hover:border-dim",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={selected}
              onChange={() => onChange(o.value)}
              onBlur={onBlur}
              className="sr-only"
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}
