import { CtaButton } from "@/components/brand/CtaButton";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Section } from "@/components/layout/Section";
import { BorderBeam } from "@/components/ui/border-beam";
import { SIGNUP_HREF } from "@/lib/launch";
import {
  CURRENCY,
  LAUNCH_PROMOTION_LIMIT,
  PRICE_TODAY,
  PROGRAMME_WEEKS,
} from "@/lib/pricing";
import { launchCopy } from "@/content/launch-copy";

// Half off the programme fee, matching the Stripe coupon the CTA applies.
const FOUNDER_PRICE = PRICE_TODAY / 2;

const PERKS = [
  {
    title: "Half off the programme fee",
    body: `${CURRENCY}${FOUNDER_PRICE} instead of ${CURRENCY}${PRICE_TODAY} for the full ${PROGRAMME_WEEKS} weeks.`,
  },
  {
    title: "50% off the Complete Stack",
    body: "The Formula Male or Female stack, at half price alongside your programme.",
  },
  {
    title: "Applied automatically",
    body: "The founder discount is added to your order as soon as you reach checkout.",
  },
];

export function FounderOfferSection() {
  return (
    <Section divided id="founder-offer">
      <SectionHeader
        eyebrow="Founder launch offer"
        heading={`Only the first ${LAUNCH_PROMOTION_LIMIT} members.`}
        headingChars={24}
        leadChars={50}
        lead="Standard pricing returns once the founder places are gone."
      />
      <div className="mt-11 grid gap-3.5 md:grid-cols-3 md:grid-rows-[auto_1fr]">
        {PERKS.map((perk, i) => (
          <Reveal
            key={perk.title}
            delayMs={i * 80}
            className="grid h-full md:row-span-2 md:grid-rows-subgrid"
          >
            {/* Subgrid keeps the titles and the bodies on shared rows, so a
                title that wraps to two lines doesn't push its body out of step
                with the neighbouring cards. */}
            <div className="border-hairline-strong relative grid h-full gap-2 overflow-hidden rounded-xs border p-6 md:row-span-2 md:grid-rows-subgrid">
              <h3 className="text-h3 font-semibold">{perk.title}</h3>
              <p className="text-muted leading-[1.6]">{perk.body}</p>
              <BorderBeam
                size={70}
                duration={7}
                delay={i * 2.3}
                colorFrom="var(--red)"
                colorTo="var(--red-bright)"
                className="motion-reduce:hidden"
              />
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delayMs={240}>
        <div className="mt-9 flex justify-center">
          <CtaButton href={SIGNUP_HREF} size="lg">
            {launchCopy.cta}
          </CtaButton>
        </div>
      </Reveal>
    </Section>
  );
}
