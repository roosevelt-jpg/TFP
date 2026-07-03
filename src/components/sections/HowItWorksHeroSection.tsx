import { Eyebrow } from "@/components/brand/Eyebrow";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeading } from "@/components/brand/SectionHeading";
import { Container } from "@/components/layout/Container";

export function HowItWorksHeroSection() {
  return (
    <section className="relative pt-[clamp(34px,6vw,64px)] pb-(--space-section)">
      <GridBackdrop vignette="soft" />
      <Container
        width="narrow"
        className="relative z-1 max-w-[760px] text-center"
      >
        <Reveal>
          <Eyebrow align="center">How it works</Eyebrow>
        </Reveal>
        <Reveal delayMs={60}>
          <SectionHeading
            as="h1"
            size="display"
            align="center"
            className="mt-4"
          >
            A coach that lives in your <em>WhatsApp.</em>
          </SectionHeading>
        </Reveal>
        <Reveal delayMs={120}>
          <p className="text-muted text-lead mx-auto mt-[18px] max-w-[50ch] leading-[1.6]">
            No new app. No logging into a dashboard you’ll forget. Kane’s method
            reaches you in the one place you already are — and actually keeps
            you going for eight weeks.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
