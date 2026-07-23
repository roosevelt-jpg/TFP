"use client";

import { cn } from "@/lib/cn";
import { useDisclosure } from "@/hooks/use-disclosure";

type OptionalDisclosureProps = {
  summary: React.ReactNode;
  defaultOpen?: boolean;
  // When provided, the disclosure is controlled: the parent owns `open` and is
  // told about toggles via `onOpenChange` (used to force it open when a field
  // inside has a validation error). Omit both for self-managed behaviour.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export function OptionalDisclosure({
  summary,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  children,
}: OptionalDisclosureProps) {
  const internal = useDisclosure(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internal.open;

  const toggle = () => {
    const next = !open;
    if (!isControlled) internal.set(next);
    onOpenChange?.(next);
  };

  return (
    <div className="border-hairline border-t pt-5">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="group/disclosure text-muted hover:text-text flex w-full items-center justify-between gap-4 text-[0.9rem] font-medium transition-colors"
      >
        {summary}
        <span
          aria-hidden
          className={cn(
            "border-hairline-strong text-text grid size-6.5 shrink-0 place-items-center rounded-xs border text-[1.05rem] leading-none transition-transform duration-300",
            open && "rotate-45 border-current",
          )}
        >
          +
        </span>
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        {/* inert while collapsed so hidden fields leave the tab order and a11y tree */}
        <div className="overflow-hidden" inert={!open}>
          <div className="grid gap-5 pt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
