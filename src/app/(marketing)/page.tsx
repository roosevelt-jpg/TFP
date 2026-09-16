import { CtaButton } from "@/components/brand/CtaButton";
import { StickyCtaBar } from "@/components/brand/StickyCtaBar";
import { Testimonial } from "@/components/brand/Testimonial";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { AboutSection } from "@/components/sections/AboutSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { FinalCtaSection } from "@/components/sections/FinalCtaSection";
import { FounderOfferSection } from "@/components/sections/FounderOfferSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { OutcomeSection } from "@/components/sections/OutcomeSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { TransformationsSection } from "@/components/sections/TransformationsSection";
import { VslSection } from "@/components/sections/VslSection";
import { Section } from "@/components/layout/Section";
import { SIGNUP_HREF } from "@/lib/launch";
import {
  getFounderSeatsRemaining,
  getLandingCopy,
} from "@/lib/cms/landing";
import { testimonials } from "@/content/testimonials";
import { TrackCta } from "@/components/analytics/TrackCta";

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

export default async function Home() {
  const [copy, seatsLeft] = await Promise.all([
    getLandingCopy(),
    getFounderSeatsRemaining(),
  ]);
  const featured = testimonials.find((t) => t.featured) ?? testimonials[0];

  return (
    <>
      <SkipLink />
      <AnnouncementBar href={SIGNUP_HREF}>
        {copy.announcement}
        {seatsLeft != null
          ? ` · ${seatsLeft} founder seats left`
          : null}
      </AnnouncementBar>
      <SiteHeader
        nav={NAV}
        ctaOnMobile={false}
        cta={
          <TrackCta placement="header">
            <CtaButton
              href={SIGNUP_HREF}
              size="sm"
              className="hidden whitespace-nowrap min-[900px]:inline-flex"
            >
              {copy.cta}
            </CtaButton>
          </TrackCta>
        }
      />

      <main id="main" className="relative z-10">
        <HeroSection
          headline={copy.heroHeadline}
          subhead={copy.heroSubhead}
          ctaLabel={copy.cta}
          trust={copy.heroTrust}
        />
        <VslSection />
        <AboutSection />
        <TransformationsSection />
        <OutcomeSection />
        <FeaturesSection />
        <FounderOfferSection seatsLeft={seatsLeft} />
        <PricingSection
          ctaLabel={copy.cta}
          reassurance={copy.reassurance}
        />
        <Section id="social-proof" divided>
          <div className="mx-auto max-w-[640px]">
            <Testimonial
              quote={featured.quote}
              name={featured.name}
              detail={featured.detail}
              featured
            />
          </div>
        </Section>
        <FaqSection />
        <FinalCtaSection body={copy.finalCta} ctaLabel={copy.cta} />
      </main>

      <SiteFooter
        links={FOOTER_LINKS}
        disclaimer="Your Performance Coach is an AI trained on Kane's coaching style, not a live person. Results vary. Not medical advice; consult a professional before starting any programme."
      />

      <StickyCtaBar
        primary={copy.stickyLabel}
        secondary={
          seatsLeft != null
            ? `${seatsLeft} founder seats left`
            : copy.stickySecondary
        }
        cta={{ label: copy.cta, href: SIGNUP_HREF }}
      />
    </>
  );
}
