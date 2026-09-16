import { CtaButton } from "@/components/brand/CtaButton";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeading } from "@/components/brand/SectionHeading";
import { TrackCta } from "@/components/analytics/TrackCta";
import { Container } from "@/components/layout/Container";
import { SIGNUP_HREF } from "@/lib/launch";
import { launchCopy } from "@/content/launch-copy";

type Props = {
  body: string;
  ctaLabel: string;
};

export function FinalCtaSection({ body, ctaLabel }: Props) {
  return (
    <section
      id="final"
      className="border-hairline relative border-t py-[clamp(90px,14vw,160px)] text-center"
    >
      <GridBackdrop vignette="full" />
      <Container width="narrow" className="relative z-10 max-w-[780px]">
        <Reveal>
          <SectionHeading size="display" align="center">
            Your next eight weeks start with one decision.
          </SectionHeading>
        </Reveal>
        <Reveal delayMs={80}>
          <p className="text-muted mx-auto mt-5 max-w-[46ch] text-lead leading-[1.6]">
            {body} The hardest part was always starting. This time, you won&apos;t
            do it alone.
          </p>
        </Reveal>
        <Reveal delayMs={160}>
          <div className="mt-[30px] flex justify-center">
            <TrackCta placement="final">
              <CtaButton href={SIGNUP_HREF} size="lg">
                {ctaLabel}
              </CtaButton>
            </TrackCta>
          </div>
        </Reveal>
        <Reveal delayMs={220}>
          <div className="text-dim mx-auto mt-[18px] flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[0.85rem] min-[560px]:gap-x-3">
            <span>{launchCopy.trust[1]}</span>
            <span
              aria-hidden
              className="bg-hairline-strong size-[3px] rounded-full"
            />
            <span>{launchCopy.trust[2]}</span>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
