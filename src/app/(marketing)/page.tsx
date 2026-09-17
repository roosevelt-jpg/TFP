import type { Metadata } from "next";
import { Suspense } from "react";

import { TrackCta } from "@/components/analytics/TrackCta";
import { CtaButton } from "@/components/brand/CtaButton";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { StickyCtaBar } from "@/components/brand/StickyCtaBar";
import { Testimonial } from "@/components/brand/Testimonial";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Section } from "@/components/layout/Section";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { CompactFaqSection } from "@/components/sections/CompactFaqSection";
import { CompactFinalCta } from "@/components/sections/CompactFinalCta";
import { CompactHowSection } from "@/components/sections/CompactHowSection";
import { CompactVslSection } from "@/components/sections/CompactVslSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { getFounderSeatsRemaining, getLandingContent } from "@/lib/cms/landing";
import { PAYMENTS_LIVE, SIGNUP_HREF } from "@/lib/launch";
import { resolvePublicOffer } from "@/lib/offers/resolve";

const NAV = [
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
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
      <main id="main" className="relative z-10">
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

  const showVsl = content.vsl.enabled && Boolean(content.vsl.playbackId);

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

      <main id="main" className="relative z-10">
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
          <CompactVslSection
            heading={content.vsl.heading}
            lead={content.vsl.lead}
            playbackId={content.vsl.playbackId}
            poster={content.vsl.poster || undefined}
          />
        ) : null}

        {featured ? (
          <Section id="proof" divided>
            <SectionHeader
              align="center"
              eyebrow="Proof"
              heading={content.proof.heading}
              lead={content.proof.lead}
            />
            <Reveal>
              <div className="mx-auto mt-8 max-w-[640px]">
                <Testimonial
                  quote={featured.quote}
                  name={featured.name}
                  detail={featured.detail}
                  featured
                />
              </div>
            </Reveal>
            {content.proof.items.length > 1 ? (
              <div className="mx-auto mt-8 grid max-w-[960px] gap-4 min-[720px]:grid-cols-2">
                {content.proof.items
                  .filter((t) => t !== featured)
                  .slice(0, 2)
                  .map((t) => (
                    <Testimonial
                      key={t.name}
                      quote={t.quote}
                      name={t.name}
                      detail={t.detail}
                    />
                  ))}
              </div>
            ) : null}
          </Section>
        ) : null}

        {content.how.enabled ? (
          <CompactHowSection
            heading={content.how.heading}
            steps={content.how.steps}
          />
        ) : null}

        <PricingSection
          ctaLabel={content.hero.cta}
          reassurance={reassurance}
          offer={offer}
          eyebrow={content.pricing.eyebrow}
          heading={content.pricing.heading}
          features={content.pricing.features}
        />

        <CompactFaqSection
          heading={content.faq.heading}
          items={content.faq.items}
        />

        <CompactFinalCta
          heading={content.final.heading}
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
