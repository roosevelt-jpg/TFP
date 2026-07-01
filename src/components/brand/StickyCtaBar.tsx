"use client";

import { useState } from "react";

import { useMotionValueEvent, useScroll } from "motion/react";

import { cn } from "@/lib/cn";

import { CtaButton } from "./CtaButton";

type StickyCtaBarProps = {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  cta: { label: string; href: string };
  showAfter?: number;
};

export function StickyCtaBar({
  primary,
  secondary,
  cta,
  showAfter = 640,
}: StickyCtaBarProps) {
  const { scrollY } = useScroll();
  const [shown, setShown] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setShown(latest > showAfter);
  });

  return (
    <section
      aria-label="Join the waitlist"
      className={cn(
        "border-hairline-strong fixed inset-x-0 bottom-0 z-60 flex items-center justify-between gap-3 border-t bg-[rgba(10,10,10,0.9)] px-3.5 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom,0px))] backdrop-blur-md transition-transform duration-400 ease-out motion-reduce:transition-none md:hidden",
        shown ? "translate-y-0" : "translate-y-[140%]",
      )}
    >
      <div className="min-w-0 leading-[1.15]">
        <div className="font-display text-[1.05rem]">{primary}</div>
        {secondary && (
          <div className="text-dim text-[0.68rem]">{secondary}</div>
        )}
      </div>
      <CtaButton
        href={cta.href}
        size="sm"
        withArrow={false}
        className="shrink-0"
      >
        {cta.label}
      </CtaButton>
    </section>
  );
}
