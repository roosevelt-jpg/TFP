import { cn } from "@/lib/cn";

type SegmentedControlProps = {
  name: string;
  options: readonly { value: string; label: string; tip?: string }[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

export function SegmentedControl({
  name,
  options,
  value,
  onChange,
  onBlur,
  ...aria
}: SegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="flex flex-wrap gap-2"
      {...aria}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <label
            key={o.value}
            className={cn(
              "group/seg relative flex-1 basis-[calc(33.333%-0.75rem)] cursor-pointer rounded-xs border px-3 py-3 text-center text-[0.9rem] transition-[color,background-color,border-color,box-shadow]",
              "has-focus-visible:shadow-[0_0_0_3px_var(--ring)]",
              selected
                ? "border-red bg-[color-mix(in_oklab,var(--red)_12%,var(--bg-2))] text-text"
                : "border-hairline-strong bg-bg-2 text-muted hover:border-dim",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={selected}
              onChange={() => onChange(o.value)}
              onBlur={onBlur}
              aria-label={o.tip ? `${o.label}: ${o.tip}` : undefined}
              className="sr-only"
            />
            {o.label}
            {o.tip && (
              <span
                aria-hidden
                className="bg-surface-2 border-hairline-strong text-muted pointer-events-none absolute bottom-[calc(100%+9px)] left-1/2 z-10 w-max max-w-[172px] -translate-x-1/2 translate-y-[5px] rounded-xs border px-2.5 py-2 text-[0.72rem] leading-snug font-normal opacity-0 shadow-card transition-[opacity,transform] duration-150 group-hover/seg:translate-y-0 group-hover/seg:opacity-100 group-has-focus-visible/seg:translate-y-0 group-has-focus-visible/seg:opacity-100"
              >
                {o.tip}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
