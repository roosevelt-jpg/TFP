import type { Metadata } from "next";

import { CtaButton } from "@/components/brand/CtaButton";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { FaqCtaSection } from "@/components/sections/FaqCtaSection";
import { FaqHeroSection } from "@/components/sections/FaqHeroSection";
import { FaqListSection } from "@/components/sections/FaqListSection";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers on the 8-week programme, the AI Performance Coach, billing, cancelling and the money-back guarantee for The Formula Programme.",
  alternates: { canonical: "/faq" },
  openGraph: {
    url: "/faq",
    title: "FAQ | The Formula Programme",
    description:
      "Everything about the programme, the Performance Coach, billing and cancelling — answered.",
  },
};

const FOOTER_LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Support", href: "/support" },
];

export default function FaqPage() {
  return (
    <>
      <SkipLink />
      <SiteHeader
        variant="minimal"
        logoPriority
        cta={
          <CtaButton href="/join" size="sm" withArrow={false}>
            Join the waitlist
          </CtaButton>
        }
      />

      <main id="main" className="relative z-10">
        <FaqHeroSection />
        <FaqListSection />
        <FaqCtaSection />
      </main>

      <SiteFooter links={FOOTER_LINKS} />
    </>
  );
}
