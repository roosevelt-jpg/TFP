import Image from "next/image";
import Link from "next/link";

import { Container } from "./Container";

type FooterLink = { label: string; href: string };

type SiteFooterProps = {
  links?: FooterLink[];
  disclaimer?: React.ReactNode;
  width?: "default" | "narrow";
};

export function SiteFooter({
  links,
  disclaimer,
  width = "default",
}: SiteFooterProps) {
  return (
    <footer className="border-hairline relative border-t pt-12 pb-28">
      <Container width={width}>
        <div className="flex flex-wrap items-start justify-between gap-[26px]">
          <div>
            <Image
              src="/logo.svg"
              alt="The Formula Programme"
              width={1440}
              height={209}
              className="h-6 w-auto"
            />
            <p className="text-dim mt-3.5 max-w-[42ch] text-[0.9rem] leading-relaxed">
              The 8-week programme plus your Performance Coach in WhatsApp. The
              method behind The Formula, pointed at your next eight weeks.
            </p>
          </div>

          {links && links.length > 0 && (
            <nav
              aria-label="Footer"
              className="text-muted flex flex-wrap gap-x-7 gap-y-3.5 text-[0.92rem]"
            >
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-text transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
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
