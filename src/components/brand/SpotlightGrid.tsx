"use client";

import { useSpotlight } from "@/hooks/use-spotlight";

// A single page-level red grid that reveals in a circle around the cursor,
// on every section (matches the design's viewport-fixed [data-spot] layer).
export function SpotlightGrid() {
  const ref = useSpotlight<HTMLDivElement>();

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-40"
      style={{
        backgroundImage:
          "linear-gradient(to right, var(--grid-line-red) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line-red) 1px, transparent 1px)",
        backgroundSize: "var(--grid-size) var(--grid-size)",
        WebkitMaskImage:
          "radial-gradient(200px circle at var(--mx, -400px) var(--my, -400px), #000, transparent 62%)",
        maskImage:
          "radial-gradient(200px circle at var(--mx, -400px) var(--my, -400px), #000, transparent 62%)",
      }}
    />
  );
}
