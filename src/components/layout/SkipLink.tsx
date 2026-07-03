import Link from "next/link";

export function SkipLink({ href = "#main" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="bg-surface text-text focus-visible:ring-ring sr-only z-50 rounded-sm px-4 py-2 focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:ring-2"
    >
      Skip to content
    </Link>
  );
}
