import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/cn";

import { Container } from "./Container";

type NavItem = { label: string; href: string };

type SiteHeaderProps = {
  nav?: NavItem[];
  cta?: React.ReactNode;
  variant?: "full" | "minimal";
  // Set on pages with no hero image, where the logo is the LCP element.
  logoPriority?: boolean;
  // Minimal variant only: hide the cta on mobile (e.g. /join relocates it).
  ctaOnMobile?: boolean;
};

export function SiteHeader({
  nav,
  cta,
  variant = "full",
  logoPriority = false,
  ctaOnMobile = true,
}: SiteHeaderProps) {
  return (
    <header className="relative z-2 py-[18px]">
      <Container
        className={cn(
          "flex items-center gap-4 min-[900px]:justify-between",
          // Logo + cta both visible on mobile → pin them to the edges so the
          // logo lines up with the content gutter below; otherwise centre.
          variant === "full" || ctaOnMobile
            ? "justify-between"
            : "justify-center",
        )}
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[0.98rem] font-semibold"
        >
          <Image
            src="/logo.svg"
            alt="The Formula Programme"
            width={1440}
            height={209}
            preload={logoPriority}
            className="relative top-[3px] h-[26px] w-auto"
          />
        </Link>

        {variant === "minimal" ? (
          <div className={ctaOnMobile ? undefined : "hidden min-[900px]:block"}>
            {cta ?? (
              <Link href="/" className="text-muted text-[0.92rem]">
                Back to site
              </Link>
            )}
          </div>
        ) : (
          // gap matches the nav's own 30px once the links are visible, so the
          // space before the CTA doesn't read tighter than the gaps between
          // links. Stays 16px below that, where only the logo and CTA show.
          <div className="flex items-center gap-4 min-[900px]:gap-7.5">
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
            </nav>
            {cta}
          </div>
        )}
      </Container>
    </header>
  );
}
