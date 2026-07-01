import Image from "next/image";
import Link from "next/link";

type NavItem = { label: string; href: string };

type SiteHeaderProps = {
  nav?: NavItem[];
  cta?: React.ReactNode;
  variant?: "full" | "minimal";
};

export function SiteHeader({ nav, cta, variant = "full" }: SiteHeaderProps) {
  return (
    <header className="relative z-2 px-(--gutter) py-[18px]">
      <div className="mx-auto flex max-w-(--maxw) items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[0.98rem] font-semibold"
        >
          <Image
            src="/logo.svg"
            alt="The Formula Programme"
            width={1440}
            height={209}
            className="h-[26px] w-auto"
            priority
          />
        </Link>

        {variant === "minimal" ? (
          <Link href="/" className="text-muted text-[0.92rem]">
            Back to site
          </Link>
        ) : (
          <nav
            aria-label="Main"
            className="hidden items-center gap-[30px] text-[0.92rem] min-[900px]:flex"
          >
            {nav?.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted hover:text-text transition-colors"
              >
                {item.label}
              </Link>
            ))}
            {cta}
          </nav>
        )}
      </div>
    </header>
  );
}
