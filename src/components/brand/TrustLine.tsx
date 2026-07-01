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
        "text-dim flex flex-wrap items-center gap-3 text-[0.84rem]",
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
