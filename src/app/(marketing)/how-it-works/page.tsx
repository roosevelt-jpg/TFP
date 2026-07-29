import type { Metadata } from "next";

import { CtaButton } from "@/components/brand/CtaButton";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { HowItWorksCoachSection } from "@/components/sections/HowItWorksCoachSection";
import { HowItWorksCtaSection } from "@/components/sections/HowItWorksCtaSection";
import { HowItWorksHeroSection } from "@/components/sections/HowItWorksHeroSection";
import { HowItWorksStepsSection } from "@/components/sections/HowItWorksStepsSection";
import { SIGNUP_HREF } from "@/lib/launch";
import { launchCopy } from "@/content/launch-copy";

export const metadata: Metadata = {
  title: "How it works",
  description: launchCopy.howItWorksDescription,
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
          <CtaButton href={SIGNUP_HREF} size="sm" withArrow={false}>
            {launchCopy.ctaLower}
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
