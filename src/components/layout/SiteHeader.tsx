import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/cn";

import { Container } from "./Container";

type NavItem = { label: string; href: string };

type SiteHeaderProps = {
  nav?: NavItem[];
  cta?: React.ReactNode;
  variant?: "full" | "minimal";
  logoPriority?: boolean;
  ctaOnMobile?: boolean;
  /** CMS-driven logo path or URL. */
  logoSrc?: string;
  brandName?: string;
};

export function SiteHeader({
  nav,
  cta,
  variant = "full",
  logoPriority = false,
  ctaOnMobile = true,
  logoSrc = "/logo.svg",
  brandName = "The Formula Programme",
}: SiteHeaderProps) {
  return (
    <header className="relative z-2 py-[18px]">
      <Container
        className={cn(
          "flex items-center gap-4 min-[900px]:justify-between",
          ctaOnMobile ? "justify-between" : "justify-center",
        )}
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[0.98rem] font-semibold"
        >
          <Image
            src={logoSrc}
            alt={brandName}
            width={1440}
            height={209}
            preload={logoPriority}
            className="relative top-[3px] h-[26px] w-auto"
            unoptimized={logoSrc.startsWith("/uploads/") || logoSrc.startsWith("http")}
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
