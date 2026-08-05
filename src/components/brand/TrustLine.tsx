import { cn } from "@/lib/cn";

type TrustLineProps = {
  rating?: number;
  children: React.ReactNode;
  className?: string;
};

export function TrustLine({ rating = 5, children, className }: TrustLineProps) {
  return (
    <div
      className={cn(
        // Centred column when the stars and text can't share a line (every
        // phone width), so the two halves don't centre independently of each
        // other and read as misaligned.
        "text-dim flex flex-col items-center gap-1.5 text-center text-[0.84rem] min-[520px]:flex-row min-[520px]:gap-3 min-[520px]:text-left",
        className,
      )}
    >
      <span aria-hidden className="text-muted tracking-[2px]">
        {"★".repeat(Math.max(0, Math.round(rating)))}
      </span>
      <span>{children}</span>
    </div>
  );
}
