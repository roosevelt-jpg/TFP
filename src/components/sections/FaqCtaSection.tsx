import { CtaButton } from "@/components/brand/CtaButton";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeading } from "@/components/brand/SectionHeading";
import { Container } from "@/components/layout/Container";
import { PRICE_MONTHLY, PRICE_TODAY } from "@/lib/pricing";

export function FaqCtaSection() {
  return (
    <section className="relative pb-[clamp(60px,9vw,100px)]">
      <Container>
        <Reveal>
          <div className="bg-bg border-hairline border-t-red rounded-md border border-t-2 p-[clamp(26px,4vw,38px)] text-center">
            <SectionHeading align="center">
              Ready when <em>you are.</em>
            </SectionHeading>
            <p className="text-muted text-lead mx-auto mt-3.5 max-w-[42ch] leading-[1.6]">
              Joining the waitlist is free. When early access opens it’s £
              {PRICE_TODAY} to start (programme + AI coach for 8 weeks), then £
              {PRICE_MONTHLY}/mo, cancel anytime.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <CtaButton href="/join" size="lg">
                Join the waitlist
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
