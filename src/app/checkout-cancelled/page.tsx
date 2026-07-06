import type { Metadata } from "next";
import Link from "next/link";

import { CtaButton } from "@/components/brand/CtaButton";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { SecureBadge } from "@/components/brand/SecureBadge";
import { Container } from "@/components/layout/Container";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { SIGNUP_HREF } from "@/lib/launch";
import { CURRENCY, PRICE_TODAY } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Checkout not completed",
  robots: { index: false },
};

const FOOTER_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Support", href: "/support" },
];

export default function CheckoutCancelledPage() {
  return (
    <>
      <SkipLink />
      <SiteHeader variant="minimal" logoPriority />

      <main
        id="main"
        className="relative z-10 flex-1 py-[clamp(40px,9vw,90px)]"
      >
        <GridBackdrop vignette="hero" />
        <Container width="narrow" className="relative z-1 text-center">
          <Eyebrow align="center">Checkout not completed</Eyebrow>
          <h1 className="text-display mt-4">
            No charge made. Your <em>spot’s still here.</em>
          </h1>
          <p className="text-muted text-lead mx-auto mt-[18px] max-w-[44ch] leading-[1.6]">
            Looks like checkout was cancelled before it finished, so your card
            wasn’t charged. No drama: pick up right where you left off and your
            coach is still waiting.
          </p>

          <div className="mt-[30px] flex flex-wrap justify-center gap-3">
            <CtaButton href={SIGNUP_HREF} size="md" withArrow={false}>
              Finish signing up
            </CtaButton>
            <CtaButton href="/" variant="ghost" size="md" withArrow={false}>
              Back to home
            </CtaButton>
          </div>

          <div className="text-dim mt-[22px] flex flex-wrap items-center justify-center gap-x-3.5 gap-y-2 text-[0.8rem]">
            <SecureBadge label="Secure Stripe checkout" />
            <span
              aria-hidden
              className="bg-hairline-strong size-[3px] rounded-full"
            />
            <span>
              {CURRENCY}
              {PRICE_TODAY} today · cancel anytime
            </span>
          </div>

          <div className="border-hairline mt-[34px] border-t pt-[22px]">
            <p className="text-muted text-[0.9rem] leading-[1.6]">
              Card declined or something not working?{" "}
              <Link href="/support" className="text-text underline">
                Contact the team
              </Link>{" "}
              and we’ll sort it.
            </p>
          </div>
        </Container>
      </main>

      <SiteFooter links={FOOTER_LINKS} width="narrow" minimal />
    </>
  );
}
