import { cn } from "@/lib/cn";

type GridBackdropProps = {
  vignette?: "hero" | "soft" | "full";
  className?: string;
};

// The static white grid, scoped to its section and masked by a vignette.
// (The red cursor-follow grid is the page-level <SpotlightGrid>.)
export function GridBackdrop({
  vignette = "soft",
  className,
}: GridBackdropProps) {
  const mask = `var(--vignette-${vignette})`;

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 z-0", className)}
      style={{
        backgroundImage:
          "linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)",
        backgroundSize: "var(--grid-size) var(--grid-size)",
        // Anchor tiling to the viewport so these lines coincide with the
        // viewport-fixed red SpotlightGrid (no offset double-grid).
        backgroundAttachment: "fixed",
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );
}
