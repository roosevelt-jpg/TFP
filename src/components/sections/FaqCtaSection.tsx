import { CtaButton } from "@/components/brand/CtaButton";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeading } from "@/components/brand/SectionHeading";
import { Container } from "@/components/layout/Container";
import { SIGNUP_HREF } from "@/lib/launch";
import { PRICE_MONTHLY, PRICE_TODAY } from "@/lib/pricing";
import { launchCopy } from "@/content/launch-copy";

export function FaqCtaSection() {
  return (
    <section className="relative pb-[clamp(60px,9vw,100px)]">
      <Container>
        <Reveal>
          <div className="bg-bg border-hairline rounded-md border p-[clamp(26px,4vw,38px)] text-center">
            <SectionHeading align="center">
              Ready when <em>you are.</em>
            </SectionHeading>
            <p className="text-muted text-lead mx-auto mt-3.5 max-w-[42ch] leading-[1.6]">
              {launchCopy.priceLead} £{PRICE_TODAY} to start (programme + AI
              coach for 8 weeks), then £{PRICE_MONTHLY}/mo, cancel anytime.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <CtaButton href={SIGNUP_HREF} size="lg">
                {launchCopy.ctaLower}
              </CtaButton>
              <CtaButton
                href="/how-it-works"
                variant="ghost"
                size="lg"
                withArrow={false}
                withShine={false}
              >
                How it works
              </CtaButton>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
