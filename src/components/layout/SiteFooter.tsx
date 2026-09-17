import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/cn";

import { Container } from "./Container";

type FooterLink = { label: string; href: string };

type SiteFooterProps = {
  links?: FooterLink[];
  disclaimer?: React.ReactNode;
  width?: "default" | "narrow";
  // Compact single-row footer for utility pages (404, checkout) — no logo block.
  minimal?: boolean;
  logoSrc?: string;
  brandName?: string;
  tagline?: string;
};

function FooterNav({
  links,
  className,
  linkClassName,
}: {
  links?: FooterLink[];
  className: string;
  linkClassName?: string;
}) {
  if (!links || links.length === 0) return null;
  return (
    <nav aria-label="Footer" className={className}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn("hover:text-text transition-colors", linkClassName)}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function SiteFooter({
  links,
  disclaimer,
  width = "default",
  minimal = false,
  logoSrc = "/logo.svg",
  brandName = "The Formula Programme",
  tagline = "The 8-week programme plus your Performance Coach in WhatsApp. The method behind The Formula, pointed at your next eight weeks.",
}: SiteFooterProps) {
  if (minimal) {
    return (
      <footer className="border-hairline relative z-10 border-t py-6">
        <Container width={width}>
          <div className="text-dim flex flex-wrap items-center justify-between gap-x-[22px] gap-y-2.5 text-[0.78rem]">
            <span>© 2026 The Formula Performance.</span>
            <FooterNav
              links={links}
              className="flex flex-wrap gap-x-[22px] gap-y-2.5"
              linkClassName="text-muted"
            />
          </div>
        </Container>
      </footer>
    );
  }

  return (
    <footer className="border-hairline relative border-t pt-12 pb-28">
      <Container width={width}>
        <div className="flex flex-wrap items-start justify-between gap-[26px]">
          <div>
            <Image
              src={logoSrc}
              alt={brandName}
              width={1440}
              height={209}
              className="h-6 w-auto"
              unoptimized={
                logoSrc.startsWith("/uploads/") || logoSrc.startsWith("http")
              }
            />
            {tagline ? (
              <p className="text-dim mt-3.5 max-w-[42ch] text-[0.9rem] leading-relaxed">
                {tagline}
              </p>
            ) : null}
          </div>

          <FooterNav
            links={links}
            className="text-muted flex flex-wrap gap-x-7 gap-y-3.5 text-[0.92rem]"
          />
        </div>

        <div className="bg-hairline mt-[30px] mb-5 h-px" />

        <div className="text-dim flex flex-wrap justify-between gap-x-[22px] gap-y-2.5 text-[0.77rem] leading-normal">
          <span>© 2026 The Formula Performance. All rights reserved.</span>
          {disclaimer && <span className="max-w-[64ch]">{disclaimer}</span>}
        </div>
      </Container>
    </footer>
  );
}
