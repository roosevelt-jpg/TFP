import { InstagramGlyph } from "@/components/brand/InstagramGlyph";
import { cn } from "@/lib/cn";

type FollowerBadgeProps = {
  count: string;
  label?: string;
  href?: string;
  className?: string;
};

const chrome =
  "inline-flex items-center gap-2.5 rounded-xs border border-white/10 bg-[rgba(16,14,13,0.82)] px-3 py-2 shadow-[0_8px_26px_rgba(0,0,0,0.4)] backdrop-blur-[13px]";

export function FollowerBadge({
  count,
  label = "Followers",
  href,
  className,
}: FollowerBadgeProps) {
  const accessibleName = `${count} ${label.toLowerCase()} on Instagram`;

  const inner = (
    <span aria-hidden className="flex flex-col leading-[1.05]">
      <span className="font-display text-[0.95rem] tabular-nums">{count}</span>
      <span className="text-eyebrow text-muted tracking-label font-semibold uppercase">
        {label}
      </span>
    </span>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${accessibleName} (opens in a new tab)`}
        className={cn(
          chrome,
          "focus-visible:ring-ring touch-manipulation transition-colors hover:border-white/25 focus-visible:ring-[3px] focus-visible:outline-none",
          className,
        )}
      >
        <InstagramGlyph size={18} />
        {inner}
      </a>
    );
  }

  return (
    <div
      role="img"
      aria-label={accessibleName}
      className={cn(chrome, className)}
    >
      <InstagramGlyph size={18} />
      {inner}
    </div>
  );
}
