import { CtaButton } from "@/components/brand/CtaButton";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeading } from "@/components/brand/SectionHeading";
import { TrackCta } from "@/components/analytics/TrackCta";
import { Container } from "@/components/layout/Container";
import { SIGNUP_HREF } from "@/lib/launch";

export function CompactFinalCta({
  heading,
  body,
  ctaLabel,
}: {
  heading: string;
  body: string;
  ctaLabel: string;
}) {
  return (
    <section
      id="final"
      className="border-hairline relative border-t py-[clamp(72px,12vw,120px)] text-center"
    >
      <GridBackdrop vignette="full" />
      <Container width="narrow" className="relative z-10 max-w-[780px]">
        <Reveal>
          <SectionHeading size="display" align="center">
            {heading}
          </SectionHeading>
        </Reveal>
        <Reveal delayMs={80}>
          <p className="text-muted mx-auto mt-5 max-w-[46ch] text-lead leading-[1.6]">
            {body}
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
      </Container>
    </section>
  );
}
