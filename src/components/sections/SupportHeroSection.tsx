import { Eyebrow } from "@/components/brand/Eyebrow";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeading } from "@/components/brand/SectionHeading";
import { Container } from "@/components/layout/Container";

export function SupportHeroSection({
  paymentsLive,
}: {
  paymentsLive: boolean;
}) {
  return (
    <section className="relative pt-[clamp(34px,6vw,64px)] pb-[clamp(20px,4vw,40px)]">
      <GridBackdrop vignette="soft" />
      <Container className="relative z-1">
        <Reveal>
          <Eyebrow>
            {paymentsLive ? "Support · Manage membership" : "Support"}
          </Eyebrow>
        </Reveal>
        <Reveal delayMs={60}>
          <SectionHeading as="h1" size="display" className="mt-3.5">
            How can we <em>help?</em>
          </SectionHeading>
        </Reveal>
        <Reveal delayMs={120}>
          <p className="text-muted text-lead mt-4 max-w-[52ch] leading-[1.6]">
            {paymentsLive
              ? "Questions, billing, changing your number or cancelling: tell us what you need and the team will get back to you within one working day."
              : "Questions about the programme, changing your WhatsApp number, or anything else: tell us what you need and the team will get back to you within one working day."}
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
