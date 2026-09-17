import { PricingCard } from "@/components/brand/PricingCard";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { TrackCta } from "@/components/analytics/TrackCta";
import { TrackPricingView } from "@/components/analytics/TrackPricingView";
import { Section } from "@/components/layout/Section";
import { SIGNUP_HREF } from "@/lib/launch";
import type { ResolvedOffer } from "@/lib/offers/resolve";
import { formatGbpAmount } from "@/lib/pricing";
import { pricingFeatures } from "@/content/marketing";

type Props = {
  ctaLabel: string;
  reassurance: string;
  offer: ResolvedOffer;
};

export function PricingSection({ ctaLabel, reassurance, offer }: Props) {
  return (
    <Section id="pricing" divided>
      <TrackPricingView />
      <SectionHeader
        align="center"
        eyebrow="Simple, honest pricing"
        heading="One price. No surprises."
      />
      <Reveal delayMs={120}>
        <div className="mt-10">
          <TrackCta placement="pricing">
            <PricingCard
              priceToday={formatGbpAmount(offer.amountDueToday)}
              priceMonthly={offer.renewalAmount}
              currency={offer.currencySymbol}
              features={pricingFeatures}
              cta={{ label: ctaLabel, href: SIGNUP_HREF }}
              reassurance={reassurance || offer.renewalDisclosure}
            />
          </TrackCta>
        </div>
      </Reveal>
    </Section>
  );
}
