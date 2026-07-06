import type { Metadata } from "next";

import { CtaButton } from "@/components/brand/CtaButton";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { HowItWorksCoachSection } from "@/components/sections/HowItWorksCoachSection";
import { HowItWorksCtaSection } from "@/components/sections/HowItWorksCtaSection";
import { HowItWorksHeroSection } from "@/components/sections/HowItWorksHeroSection";
import { HowItWorksStepsSection } from "@/components/sections/HowItWorksStepsSection";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Kane’s 8-week method, delivered by an AI Performance Coach in your WhatsApp. No new app. Join the waitlist, get the programme instantly, and show up.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    url: "/how-it-works",
    title: "How it works | The Formula Programme",
    description:
      "A coach that lives in your WhatsApp: Kane’s 8-week method, with daily check-ins and instant answers.",
  },
};

const FOOTER_LINKS = [
  { label: "FAQ", href: "/faq" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Support", href: "/support" },
];

export default function HowItWorksPage() {
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
        <HowItWorksHeroSection />
        <HowItWorksStepsSection />
        <HowItWorksCoachSection />
        <HowItWorksCtaSection />
      </main>

      <SiteFooter links={FOOTER_LINKS} />
    </>
  );
}
