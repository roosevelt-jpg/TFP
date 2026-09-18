import type { Metadata } from "next";
import { Suspense } from "react";

import { TrackCta } from "@/components/analytics/TrackCta";
import { CtaButton } from "@/components/brand/CtaButton";
import { StickyCtaBar } from "@/components/brand/StickyCtaBar";
import { Testimonial } from "@/components/brand/Testimonial";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Section } from "@/components/layout/Section";
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
import { getFounderSeatsRemaining, getLandingContent } from "@/lib/cms/landing";
import { PAYMENTS_LIVE, SIGNUP_HREF } from "@/lib/launch";
import { resolvePublicOffer } from "@/lib/offers/resolve";

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

export async function generateMetadata(): Promise<Metadata> {
  const content = await getLandingContent();
  return {
    title: content.brand.name,
    icons: {
      icon: content.brand.favicon,
    },
    openGraph: content.brand.ogImage
      ? {
          images: [{ url: content.brand.ogImage }],
        }
      : undefined,
  };
}

export default function Home() {
  return (
    <Suspense fallback={<LandingShell />}>
      <HomeContent />
    </Suspense>
  );
}

function LandingShell() {
  return (
    <>
      <SkipLink />
      <SiteHeader nav={NAV} ctaOnMobile={false} logoSrc="/logo.svg" />
      <main id="main" className="landing-dense relative z-10">
        <HeroSection
          headline="The Formula Programme"
          subhead="Loading…"
          ctaLabel="Join"
          trust=""
          eyebrow="8-week programme"
        />
      </main>
    </>
  );
}

async function HomeContent() {
  const [content, seatsLeft, offer] = await Promise.all([
    getLandingContent(),
    getFounderSeatsRemaining(),
    resolvePublicOffer(PAYMENTS_LIVE),
  ]);

  const heroTrust = PAYMENTS_LIVE
    ? offer.renewalDisclosure
    : content.hero.trust;
  const reassurance = PAYMENTS_LIVE
    ? offer.renewalDisclosure
    : content.pricing.reassurance;

  const featured =
    content.proof.items.find((t) => t.featured) ?? content.proof.items[0];

  const showVsl =
    content.vsl.enabled !== false && Boolean(content.vsl.playbackId);

  return (
    <>
      <SkipLink />
      {content.announcement.enabled ? (
        <AnnouncementBar href={SIGNUP_HREF}>
          {content.announcement.text}
          {seatsLeft != null ? ` · ${seatsLeft} founder seats left` : null}
        </AnnouncementBar>
      ) : null}

      <SiteHeader
        nav={NAV}
        ctaOnMobile={false}
        logoSrc={content.brand.logo}
        brandName={content.brand.name}
        cta={
          <TrackCta placement="header">
            <CtaButton
              href={SIGNUP_HREF}
              size="sm"
              className="hidden whitespace-nowrap min-[900px]:inline-flex"
            >
              {content.hero.cta}
            </CtaButton>
          </TrackCta>
        }
      />

      <main id="main" className="landing-dense relative z-10">
        <HeroSection
          headline={content.hero.headline}
          subhead={content.hero.subhead}
          ctaLabel={content.hero.cta}
          trust={heroTrust}
          eyebrow={content.hero.eyebrow}
          heroImage={content.hero.image || undefined}
          showWatchCta={showVsl}
        />

        {showVsl ? (
          <VslSection
            heading={content.vsl.heading}
            lead={content.vsl.lead}
            playbackId={content.vsl.playbackId}
            poster={content.vsl.poster || undefined}
          />
        ) : null}

        <AboutSection />
        <TransformationsSection />
        <OutcomeSection />
        <FeaturesSection />
        <FounderOfferSection
          seatsLeft={seatsLeft}
          offer={offer}
          ctaLabel={content.hero.cta}
        />
        <PricingSection
          ctaLabel={content.hero.cta}
          reassurance={reassurance}
          offer={offer}
          eyebrow={content.pricing.eyebrow}
          heading={content.pricing.heading}
          features={content.pricing.features}
        />

        {featured ? (
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
        ) : null}

        <FaqSection />
        <FinalCtaSection
          body={content.final.body}
          ctaLabel={content.final.cta}
        />
      </main>

      <SiteFooter
        links={FOOTER_LINKS}
        disclaimer={content.footer.disclaimer}
        logoSrc={content.brand.logo}
        brandName={content.brand.name}
        tagline={content.footer.tagline}
      />

      <StickyCtaBar
        primary={content.sticky.label}
        secondary={
          seatsLeft != null
            ? `${seatsLeft} founder seats left`
            : content.sticky.secondary
        }
        cta={{ label: content.hero.cta, href: SIGNUP_HREF }}
      />
    </>
  );
}
