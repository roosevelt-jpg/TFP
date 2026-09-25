import { CtaButton } from "@/components/brand/CtaButton";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Section } from "@/components/layout/Section";
import { BorderBeam } from "@/components/ui/border-beam";
import { PAYMENTS_LIVE, SIGNUP_HREF } from "@/lib/launch";
import type { ResolvedOffer } from "@/lib/offers/resolve";
import {
  CURRENCY,
  FOUNDER_PRICE_TODAY,
  LAUNCH_PROMOTION_LIMIT,
  PRICE_TODAY,
  PROGRAMME_WEEKS,
  formatGbpAmount,
} from "@/lib/pricing";

type Props = {
  seatsLeft?: number | null;
  offer: ResolvedOffer;
  ctaLabel: string;
};

export function FounderOfferSection({ seatsLeft, offer, ctaLabel }: Props) {
  const founderPrice = formatGbpAmount(
    PAYMENTS_LIVE ? offer.amountDueToday : FOUNDER_PRICE_TODAY,
  );
  // Pre-launch (waitlist): never claim sold-out — Stripe seats aren't live yet.
  // Live: sold out when redemptions hit the cap or the founder promo isn't active.
  const soldOut = PAYMENTS_LIVE
    ? seatsLeft === 0 || !offer.founderActive
    : false;

  const heading = soldOut
    ? "Founder places are sold out."
    : seatsLeft != null
      ? `${seatsLeft} founder seats left.`
      : `Only the first ${LAUNCH_PROMOTION_LIMIT} members.`;

  const perks = [
    {
      title: "Half off the programme fee",
      body: `${CURRENCY}${founderPrice} instead of ${CURRENCY}${PRICE_TODAY} for the full ${PROGRAMME_WEEKS} weeks.`,
    },
    {
      title: "50% off the Complete Stack",
      body: "The Formula Male or Female stack, at half price alongside your programme.",
    },
    {
      title: PAYMENTS_LIVE ? "Applied at checkout" : "Locked in at launch",
      body: PAYMENTS_LIVE
        ? "Your founder discount is attached when you start checkout from this page."
        : "Join the waitlist now — founder pricing unlocks when checkout opens.",
    },
  ];

  // when soldOut we still show CTA; perks only when founder active
  const stackHref = "/stack";

  return (
    <Section divided id="founder-offer">
      <SectionHeader
        eyebrow="Founder launch offer"
        heading={heading}
        headingChars={24}
        leadChars={50}
        lead={
          soldOut
            ? `Standard pricing is ${CURRENCY}${PRICE_TODAY} today, then membership from week ${PROGRAMME_WEEKS}.`
            : "Standard pricing returns once the founder places are gone."
        }
      />
      {!soldOut ? (
        <div
          data-landing-stack
          className="mt-8 grid gap-2.5 md:grid-cols-3 md:grid-rows-[auto_1fr]"
        >
          {perks.map((perk, i) => (
            <Reveal
              key={perk.title}
              delayMs={i * 80}
              className="grid h-full md:row-span-2 md:grid-rows-subgrid"
            >
              <div
                data-landing-card
                className="border-hairline-strong relative grid h-full gap-1.5 overflow-hidden rounded-xs border p-6 md:row-span-2 md:grid-rows-subgrid"
              >
                <h3 className="text-h3 font-semibold">{perk.title}</h3>
                <p className="text-muted text-[0.88rem] leading-[1.45]">
                  {perk.title.includes("Complete Stack") ? (
                    <>
                      {perk.body}{" "}
                      <a href={stackHref} className="text-text underline">
                        See the stack
                      </a>
                      .
                    </>
                  ) : (
                    perk.body
                  )}
                </p>
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
      ) : null}
      <Reveal delayMs={240}>
        <div className="mt-5 flex justify-center">
          <CtaButton href={SIGNUP_HREF} size="md">
            {ctaLabel}
          </CtaButton>
        </div>
      </Reveal>
    </Section>
  );
}
