import { PricingCard } from "@/components/brand/PricingCard";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Section } from "@/components/layout/Section";
import { SIGNUP_HREF } from "@/lib/launch";
import { CURRENCY, PRICE_MONTHLY, PRICE_TODAY } from "@/lib/pricing";
import { launchCopy } from "@/content/launch-copy";
import { pricingFeatures } from "@/content/marketing";

export function PricingSection() {
  return (
    <Section id="pricing" divided>
      <SectionHeader
        align="center"
        eyebrow="Simple, honest pricing"
        heading="One price. No surprises."
      />
      <Reveal delayMs={120}>
        <div className="mt-10">
          <PricingCard
            priceToday={PRICE_TODAY}
            priceMonthly={PRICE_MONTHLY}
            currency={CURRENCY}
            features={pricingFeatures}
            cta={{ label: launchCopy.cta, href: SIGNUP_HREF }}
          />
        </div>
      </Reveal>
    </Section>
  );
}
