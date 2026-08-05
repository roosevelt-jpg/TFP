import { CtaButton } from "@/components/brand/CtaButton";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { PhoneMockup } from "@/components/brand/PhoneMockup";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeading } from "@/components/brand/SectionHeading";
import { TrustLine } from "@/components/brand/TrustLine";
import { Container } from "@/components/layout/Container";
import { SIGNUP_HREF } from "@/lib/launch";
import { heroChat } from "@/content/chat-scripts";
import { launchCopy } from "@/content/launch-copy";

export function HeroSection() {
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
                8-week programme · Founder launch
              </Eyebrow>
              <Eyebrow className="hidden min-[641px]:inline-flex">
                <span>8-week programme</span>
                <span
                  aria-hidden
                  className="bg-hairline-strong size-[3px] rounded-full"
                />
                <span>Founder launch</span>
              </Eyebrow>
            </Reveal>
            <Reveal delayMs={60}>
              <SectionHeading
                as="h1"
                size="display"
                className="text-balance text-[clamp(2rem,4.2vw,3.2rem)]"
              >
                Lose fat. Build muscle. Become stronger, fitter and more
                functional in 8 weeks.
              </SectionHeading>
            </Reveal>
            <Reveal delayMs={120}>
              <p className="text-muted max-w-[33ch] text-lead leading-[1.6]">
                An 8-week training system with your own Performance Coach inside
                WhatsApp to keep you accountable every step of the way.
              </p>
            </Reveal>
            <Reveal delayMs={180}>
              <div className="flex flex-wrap items-center justify-center gap-[13px] min-[940px]:justify-start">
                <CtaButton href={SIGNUP_HREF}>{launchCopy.cta}</CtaButton>
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
              <TrustLine>{launchCopy.heroTrust}</TrustLine>
            </Reveal>
          </div>
          <Reveal
            delayMs={160}
            className="flex justify-center justify-self-center min-[940px]:block min-[940px]:self-end"
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
