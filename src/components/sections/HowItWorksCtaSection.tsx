import { CtaButton } from "@/components/brand/CtaButton";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeading } from "@/components/brand/SectionHeading";
import { Container } from "@/components/layout/Container";
import { SIGNUP_HREF } from "@/lib/launch";
import { PRICE_MONTHLY, PRICE_TODAY } from "@/lib/pricing";
import { launchCopy } from "@/content/launch-copy";

export function HowItWorksCtaSection() {
  return (
    <section className="relative py-(--space-section) text-center">
      <Container width="narrow" className="max-w-[760px]">
        <Reveal>
          <SectionHeading align="center">
            {launchCopy.heading} <em>today.</em>
          </SectionHeading>
        </Reveal>
        <Reveal delayMs={80}>
          <p className="text-muted text-lead mx-auto mt-4 max-w-[42ch] leading-[1.6]">
            {launchCopy.priceLead} £{PRICE_TODAY} to start (programme + AI coach
            for 8 weeks), then £{PRICE_MONTHLY}/mo, cancel anytime.
          </p>
        </Reveal>
        <Reveal delayMs={160}>
          <div className="mt-[26px] flex flex-wrap justify-center gap-3">
            <CtaButton href={SIGNUP_HREF} size="lg">
              {launchCopy.ctaLower}
            </CtaButton>
            <CtaButton
              href="/faq"
              variant="ghost"
              size="lg"
              withArrow={false}
              withShine={false}
            >
              Read the FAQ
            </CtaButton>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
