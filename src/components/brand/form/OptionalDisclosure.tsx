"use client";

import { cn } from "@/lib/cn";
import { useDisclosure } from "@/hooks/use-disclosure";

type OptionalDisclosureProps = {
  summary: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function OptionalDisclosure({
  summary,
  defaultOpen = false,
  children,
}: OptionalDisclosureProps) {
  const { open, toggle } = useDisclosure(defaultOpen);

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
            "border-hairline-strong text-text grid size-[26px] shrink-0 place-items-center rounded-xs border text-[1.05rem] leading-none transition-transform duration-300",
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
        <div className="overflow-hidden">
          <div className="grid gap-5 pt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
