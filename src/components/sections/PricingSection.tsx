import { PricingCard } from "@/components/brand/PricingCard";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Section } from "@/components/layout/Section";
import { CURRENCY, PRICE_MONTHLY, PRICE_TODAY } from "@/lib/pricing";
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
            cta={{ label: "Join the Waitlist", href: "/join" }}
            reassurance="No payment to join the waitlist. When your spot opens you’ll check out at this price — then cancel anytime, no retention hoops."
          />
        </div>
      </Reveal>
    </Section>
  );
}
