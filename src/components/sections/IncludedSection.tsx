import { HighlightCard } from "@/components/brand/HighlightCard";
import { IncludedCard } from "@/components/brand/IncludedCard";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Section } from "@/components/layout/Section";
import { included } from "@/content/marketing";

export function IncludedSection() {
  return (
    <Section divided>
      <SectionHeader
        eyebrow="What’s included"
        heading="Everything you need to actually finish."
        headingChars={18}
        leadChars={52}
        lead="Two things are yours the moment you’re in, and stay in your corner for the full eight weeks."
      />
      <div className="mt-[46px] grid gap-[14px]">
        <Reveal>
          <HighlightCard
            kicker="The part no PDF can give you"
            title="Your Performance Coach, in WhatsApp"
            bullets={[
              "Proactive check-ins",
              "Instant Q&A",
              "Adjusts to your week",
            ]}
            aside={
              <>
                <div className="font-display text-[clamp(4rem,11vw,6rem)] leading-[0.9] font-medium tracking-[-0.02em]">
                  24/7
                </div>
                <div className="text-dim mt-2 text-[0.66rem] font-semibold tracking-label uppercase">
                  In your pocket
                </div>
              </>
            }
          >
            In my voice, trained on how I coach. It checks in, answers and
            pushes. Every day, for eight full weeks. No new app, no logins. You
            just open WhatsApp.
          </HighlightCard>
        </Reveal>
        <div className="grid items-stretch gap-[14px] md:grid-cols-3">
          {included.map((item, i) => (
            <Reveal key={item.title} delayMs={i * 80} className="h-full">
              <IncludedCard
                index={String(i + 1).padStart(2, "0")}
                title={item.title}
                badge={i === 0 ? "Instant" : undefined}
              >
                {item.body}
              </IncludedCard>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
