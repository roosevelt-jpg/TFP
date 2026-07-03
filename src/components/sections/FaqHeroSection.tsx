import Link from "next/link";

import { Eyebrow } from "@/components/brand/Eyebrow";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeading } from "@/components/brand/SectionHeading";
import { Container } from "@/components/layout/Container";

export function FaqHeroSection() {
  return (
    <section className="relative pt-[clamp(34px,6vw,64px)] pb-[clamp(20px,4vw,40px)]">
      <GridBackdrop vignette="soft" />
      <Container className="relative z-1">
        <Reveal>
          <Eyebrow>Frequently asked</Eyebrow>
        </Reveal>
        <Reveal delayMs={60}>
          <SectionHeading as="h1" size="display" className="mt-3.5">
            Questions, <em>answered.</em>
          </SectionHeading>
        </Reveal>
        <Reveal delayMs={120}>
          <p className="text-muted text-lead mt-4 max-w-[52ch] leading-[1.6]">
            Everything about the programme, the Performance Coach, billing and
            cancelling. Still unsure?{" "}
            <Link href="/support" className="text-text underline">
              Ask the team
            </Link>
            .
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
