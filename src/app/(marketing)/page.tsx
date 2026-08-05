import { CtaButton } from "@/components/brand/CtaButton";
import { StickyCtaBar } from "@/components/brand/StickyCtaBar";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { AboutSection } from "@/components/sections/AboutSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { FinalCtaSection } from "@/components/sections/FinalCtaSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { MeasuredProgressSection } from "@/components/sections/MeasuredProgressSection";
import { OutcomeSection } from "@/components/sections/OutcomeSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { SIGNUP_HREF } from "@/lib/launch";
import { launchCopy } from "@/content/launch-copy";

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
      <AnnouncementBar
        href={
          "announcementHref" in launchCopy
            ? launchCopy.announcementHref
            : undefined
        }
      >
        {launchCopy.announcement}
      </AnnouncementBar>
      <SiteHeader
        nav={NAV}
        cta={
          <CtaButton
            href={SIGNUP_HREF}
            size="sm"
            withArrow={false}
            className="whitespace-nowrap max-[359px]:px-3"
          >
            <span className="min-[900px]:hidden">{launchCopy.ctaShort}</span>
            <span className="hidden min-[900px]:inline">{launchCopy.cta}</span>
          </CtaButton>
        }
      />

      <main id="main" className="relative z-10">
        <HeroSection />
        <AboutSection />
        <OutcomeSection />
        <FeaturesSection />
        <MeasuredProgressSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>

      <SiteFooter
        links={FOOTER_LINKS}
        disclaimer="Your Performance Coach is an AI trained on Kane's coaching style, not a live person. Results vary. Not medical advice; consult a professional before starting any programme."
      />

      <StickyCtaBar
        primary={launchCopy.stickyLabel}
        secondary={launchCopy.stickySecondary}
        cta={{ label: launchCopy.cta, href: SIGNUP_HREF }}
      />
    </>
  );
}
