import { CtaButton } from "@/components/brand/CtaButton";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeading } from "@/components/brand/SectionHeading";
import { Container } from "@/components/layout/Container";

export function FinalCtaSection() {
  return (
    <section
      id="final"
      className="border-hairline relative border-t py-[clamp(90px,14vw,160px)] text-center"
    >
      <GridBackdrop vignette="full" />
      <Container width="narrow" className="relative z-10 max-w-[780px]">
        <Reveal>
          <SectionHeading size="display" align="center">
            Your next eight weeks start <em>with one text.</em>
          </SectionHeading>
        </Reveal>
        <Reveal delayMs={80}>
          <p className="text-muted mx-auto mt-5 max-w-[46ch] text-lead leading-[1.6]">
            Join the waitlist and be first in line when early access opens. The
            hardest part was always starting. This time, you won’t do it alone.
          </p>
        </Reveal>
        <Reveal delayMs={160}>
          <div className="mt-[30px] flex justify-center">
            <CtaButton href="/join" size="lg">
              Join the Waitlist
            </CtaButton>
          </div>
        </Reveal>
        <Reveal delayMs={220}>
          <div className="text-dim mx-auto mt-[18px] flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[0.85rem] min-[560px]:gap-x-3">
            <span>No payment to join</span>
            <span
              aria-hidden
              className="bg-hairline-strong size-[3px] rounded-full"
            />
            <span>early-access pricing</span>
            <span
              aria-hidden
              className="bg-hairline-strong hidden size-[3px] rounded-full min-[560px]:inline-block"
            />
            <span>be first when we launch</span>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
