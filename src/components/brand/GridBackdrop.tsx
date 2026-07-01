"use client";

import { cn } from "@/lib/cn";
import { useSpotlight } from "@/hooks/use-spotlight";

type GridBackdropProps = {
  spotlight?: boolean;
  animated?: boolean;
  vignette?: "hero" | "soft" | "full";
  fixed?: boolean;
  className?: string;
};

export function GridBackdrop({
  spotlight = false,
  animated = false,
  vignette = "soft",
  fixed = false,
  className,
}: GridBackdropProps) {
  const ref = useSpotlight<HTMLDivElement>();
  const mask = `var(--vignette-${vignette})`;

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "pointer-events-none inset-0 z-0",
        fixed ? "fixed" : "absolute",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-0",
          animated && "motion-safe:animate-[breathe_6s_ease-in-out_infinite]",
        )}
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "var(--grid-size) var(--grid-size)",
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      />
      {spotlight && (
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--grid-line-red) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line-red) 1px, transparent 1px)",
            backgroundSize: "var(--grid-size) var(--grid-size)",
            WebkitMaskImage: "var(--spotlight-mask)",
            maskImage: "var(--spotlight-mask)",
          }}
        />
      )}
    </div>
  );
}
