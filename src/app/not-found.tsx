import type { Metadata } from "next";

import { CtaButton } from "@/components/brand/CtaButton";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { SpotlightGrid } from "@/components/brand/SpotlightGrid";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { PAYMENTS_LIVE, SIGNUP_HREF } from "@/lib/launch";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

const FOOTER_LINKS = [
  { label: "Home", href: "/" },
  { label: "Support", href: "/support" },
  { label: "Privacy", href: "/privacy" },
];

export default function NotFound() {
  return (
    <>
      <SkipLink />
      <SpotlightGrid />
      <SiteHeader variant="minimal" logoPriority />

      <main
        id="main"
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-(--gutter) py-[clamp(30px,7vw,70px)] text-center"
      >
        <GridBackdrop vignette="hero" />
        <div className="relative z-1 flex flex-col items-center">
          <p className="font-display text-[clamp(7rem,26vw,15rem)] leading-[0.82] font-medium tracking-[-0.04em]">
            <span className="sr-only">404</span>
            <span aria-hidden>
              4<span className="text-red">0</span>4
            </span>
          </p>
          <Eyebrow align="center" className="mt-2">
            Page not found
          </Eyebrow>
          <h1 className="mt-4 text-[clamp(1.7rem,4.5vw,2.6rem)]">
            You’ve wandered <em>off plan.</em>
          </h1>
          <p className="text-muted mt-3.5 max-w-[42ch] text-[clamp(1.02rem,2.1vw,1.18rem)] leading-[1.6]">
            This page doesn’t exist, or it moved. Let’s get you back to where
            the work happens.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <CtaButton href="/" size="md" withArrow={false}>
              Back to home
            </CtaButton>
            <CtaButton
              href={SIGNUP_HREF}
              variant="ghost"
              size="md"
              withArrow={false}
            >
              {PAYMENTS_LIVE ? "Start my 8 weeks" : "Join the waitlist"}
            </CtaButton>
          </div>
        </div>
      </main>

      <SiteFooter links={FOOTER_LINKS} minimal />
    </>
  );
}
