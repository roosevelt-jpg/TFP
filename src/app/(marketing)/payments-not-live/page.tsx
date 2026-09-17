import type { Metadata } from "next";
import Link from "next/link";

import { CtaButton } from "@/components/brand/CtaButton";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { Container } from "@/components/layout/Container";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";

export const metadata: Metadata = {
  title: "Payments opening soon",
  robots: { index: false },
};

const FOOTER_LINKS = [
  { label: "Join the waitlist", href: "/join" },
  { label: "Support", href: "/support" },
];

/** Shown when PAYMENTS_LIVE is false and someone hits /checkout. */
export default function PaymentsNotLivePage() {
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
          <Eyebrow align="center">Not open yet</Eyebrow>
          <h1 className="text-display mt-4">
            Checkout isn’t live. <em>Join the waitlist.</em>
          </h1>
          <p className="text-muted text-lead mx-auto mt-4.5 max-w-[44ch] leading-[1.6]">
            Paid checkout opens with the founder launch. Join the waitlist now
            and we’ll email you the moment spots unlock — no charge today.
          </p>

          <div className="mt-7.5 flex flex-wrap justify-center gap-3">
            <CtaButton href="/join" size="md" withArrow={false}>
              Join the waitlist
            </CtaButton>
            <CtaButton href="/" variant="ghost" size="md" withArrow={false}>
              Back to home
            </CtaButton>
          </div>

          <p className="text-muted mt-8 text-[0.9rem] leading-[1.6]">
            Questions?{" "}
            <Link href="/support" className="text-text underline">
              Talk to the team
            </Link>
            .
          </p>
        </Container>
      </main>

      <SiteFooter links={FOOTER_LINKS} width="narrow" minimal />
    </>
  );
}
