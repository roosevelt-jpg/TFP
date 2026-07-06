import { CtaButton } from "@/components/brand/CtaButton";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { PhoneMockup } from "@/components/brand/PhoneMockup";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeading } from "@/components/brand/SectionHeading";
import { TrustLine } from "@/components/brand/TrustLine";
import { Typewriter } from "@/components/brand/Typewriter";
import { Container } from "@/components/layout/Container";
import { heroChat, heroTypewriter } from "@/content/chat-scripts";

export function HeroSection() {
  return (
    <section
      id="top"
      className="relative pt-[clamp(24px,4vw,52px)] pb-(--space-section)"
    >
      <GridBackdrop vignette="hero" />
      <Container className="relative z-10">
        <div className="grid items-center gap-[clamp(28px,5vw,56px)] min-[940px]:grid-cols-[1.06fr_.94fr]">
          <div className="grid max-w-[560px] justify-items-center gap-[22px] text-center min-[940px]:justify-items-start min-[940px]:text-left">
            <Reveal>
              <Eyebrow align="center" className="min-[641px]:hidden">
                8-week plan + WhatsApp coach
              </Eyebrow>
              <Eyebrow className="hidden min-[641px]:inline-flex">
                <span>8-week programme</span>
                <span
                  aria-hidden
                  className="bg-hairline-strong size-[3px] rounded-full"
                />
                <span>Coach in your WhatsApp</span>
              </Eyebrow>
            </Reveal>
            <Reveal delayMs={60}>
              <SectionHeading as="h1" size="display">
                The 8-week programme that
                <br />
                <Typewriter phrases={heroTypewriter} />
              </SectionHeading>
            </Reveal>
            <Reveal delayMs={120}>
              <p className="text-muted max-w-[33ch] text-lead leading-[1.6]">
                My full 8-week training &amp; nutrition system, plus your own
                Performance Coach in your WhatsApp, built on exactly how I
                coach. It checks in, holds you to your word, and answers
                whenever you need it.
              </p>
            </Reveal>
            <Reveal delayMs={180}>
              <div className="flex flex-wrap items-center justify-center gap-[13px] min-[940px]:justify-start">
                <CtaButton href="/join">Join the Waitlist</CtaButton>
                <CtaButton
                  href="/how-it-works"
                  variant="ghost"
                  withShine={false}
                >
                  See how it works
                </CtaButton>
              </div>
            </Reveal>
            <Reveal delayMs={240}>
              <TrustLine>No payment to join · £149 at launch</TrustLine>
            </Reveal>
          </div>
          <Reveal
            delayMs={160}
            className="justify-self-center min-[940px]:self-end"
          >
            <PhoneMockup
              image={{
                src: "/assets/kane-hero.png",
                alt: "Kane Mousah, former professional Bellator fighter and founder of The Formula",
              }}
              chat={heroChat}
            />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
