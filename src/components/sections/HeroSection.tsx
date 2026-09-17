import Image from "next/image";

import { CtaButton } from "@/components/brand/CtaButton";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { PhoneMockup } from "@/components/brand/PhoneMockup";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeading } from "@/components/brand/SectionHeading";
import { TrustLine } from "@/components/brand/TrustLine";
import { TrackCta } from "@/components/analytics/TrackCta";
import { Container } from "@/components/layout/Container";
import { SIGNUP_HREF } from "@/lib/launch";
import { heroChat } from "@/content/chat-scripts";

type Props = {
  headline: string;
  subhead: string;
  ctaLabel: string;
  trust: string;
  eyebrow?: string;
  heroImage?: string;
  showWatchCta?: boolean;
};

export function HeroSection({
  headline,
  subhead,
  ctaLabel,
  trust,
  eyebrow = "8-week programme · Founder launch",
  heroImage,
  showWatchCta = false,
}: Props) {
  const parts = eyebrow.split("·").map((p) => p.trim()).filter(Boolean);

  return (
    <section
      id="top"
      className="relative pt-[clamp(24px,4vw,52px)] pb-(--space-section)"
    >
      <GridBackdrop vignette="hero" />
      <Container className="relative z-10">
        <div className="grid items-center gap-[clamp(28px,5vw,56px)] min-[940px]:grid-cols-[1.06fr_.94fr]">
          <div className="mx-auto grid max-w-[560px] justify-items-center gap-[22px] text-center min-[940px]:mx-0 min-[940px]:justify-items-start min-[940px]:text-left">
            <Reveal>
              <Eyebrow align="center" className="min-[641px]:hidden">
                {eyebrow}
              </Eyebrow>
              <Eyebrow className="hidden min-[641px]:inline-flex">
                {parts.map((part, i) => (
                  <span key={part} className="inline-flex items-center gap-2">
                    {i > 0 ? (
                      <span
                        aria-hidden
                        className="bg-hairline-strong size-[3px] rounded-full"
                      />
                    ) : null}
                    <span>{part}</span>
                  </span>
                ))}
              </Eyebrow>
            </Reveal>
            <Reveal delayMs={60}>
              <SectionHeading
                as="h1"
                size="display"
                className="text-balance text-[clamp(2rem,4.2vw,3.2rem)]"
              >
                {headline}
              </SectionHeading>
            </Reveal>
            <Reveal delayMs={120}>
              <p className="text-muted max-w-[36ch] text-lead leading-[1.6]">
                {subhead}
              </p>
            </Reveal>
            <Reveal delayMs={180}>
              <div className="flex flex-wrap items-center justify-center gap-[13px] min-[940px]:justify-start">
                <TrackCta placement="hero">
                  <CtaButton href={SIGNUP_HREF}>{ctaLabel}</CtaButton>
                </TrackCta>
                {showWatchCta ? (
                  <CtaButton href="#watch" variant="ghost" withShine={false}>
                    Watch Kane explain it
                  </CtaButton>
                ) : null}
              </div>
            </Reveal>
            {trust ? (
              <Reveal delayMs={240}>
                <TrustLine>{trust}</TrustLine>
              </Reveal>
            ) : null}
          </div>
          <Reveal
            delayMs={160}
            className="flex justify-center justify-self-center min-[940px]:block min-[940px]:self-end"
          >
            {heroImage ? (
              <div className="relative aspect-[3/4] w-full max-w-[360px] overflow-hidden rounded-sm">
                <Image
                  src={heroImage}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="360px"
                  priority
                />
              </div>
            ) : (
              <PhoneMockup
                image={{
                  src: "/assets/kane-hero.png",
                  alt: "Kane Mousah, founder of The Formula",
                }}
                chat={heroChat}
              />
            )}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
