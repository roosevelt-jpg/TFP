import { CtaButton } from "@/components/brand/CtaButton";
import { PressMarquee } from "@/components/brand/PressMarquee";
import { StickyCtaBar } from "@/components/brand/StickyCtaBar";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { AboutSection } from "@/components/sections/AboutSection";
import { CommunitySection } from "@/components/sections/CommunitySection";
import { FaqSection } from "@/components/sections/FaqSection";
import { FinalCtaSection } from "@/components/sections/FinalCtaSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { IncludedSection } from "@/components/sections/IncludedSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { ProblemSection } from "@/components/sections/ProblemSection";
import { SocialProofSection } from "@/components/sections/SocialProofSection";
import { SolutionSection } from "@/components/sections/SolutionSection";
import { SIGNUP_HREF } from "@/lib/launch";
import { launchCopy } from "@/content/launch-copy";
import { pressLogos } from "@/content/press-logos";

const NAV = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/faq" },
];

const FOOTER_LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "FAQ", href: "/faq" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Refunds", href: "/support?type=refund" },
  { label: "Contact", href: "/support" },
];

export default function Home() {
  return (
    <>
      <SkipLink />
      <AnnouncementBar>{launchCopy.announcement}</AnnouncementBar>
      <SiteHeader
        nav={NAV}
        cta={
          <CtaButton href={SIGNUP_HREF} size="sm" withArrow={false}>
            {launchCopy.cta}
          </CtaButton>
        }
      />

      <main id="main" className="relative z-10">
        <HeroSection />
        <PressMarquee logos={pressLogos} />
        <ProblemSection />
        <SolutionSection />
        <IncludedSection />
        <HowItWorksSection />
        <AboutSection />
        <SocialProofSection />
        <CommunitySection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>

      <SiteFooter
        links={FOOTER_LINKS}
        disclaimer="Your Performance Coach is an AI trained on Kane's coaching style, not a live person. Results vary. Not medical advice; consult a professional before starting any programme."
      />

      <StickyCtaBar
        primary={launchCopy.ctaLower}
        secondary={launchCopy.stickySecondary}
        cta={{ label: launchCopy.cta, href: SIGNUP_HREF }}
      />
    </>
  );
}
