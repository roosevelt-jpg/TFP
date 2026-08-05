import { Eyebrow } from "@/components/brand/Eyebrow";
import { IncludedCard } from "@/components/brand/IncludedCard";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Section } from "@/components/layout/Section";
import { community, features } from "@/content/marketing";

export function FeaturesSection() {
  return (
    <Section divided>
      <SectionHeader
        eyebrow="How it works"
        heading="Your Performance Coach, inside WhatsApp"
        headingChars={26}
        leadChars={52}
        lead="One number to save. For eight weeks it's how you train, eat and stay on track, all in the app you already have open."
      />
      <div className="mt-11.5 grid items-stretch gap-3.5 md:grid-cols-2">
        {features.map((item, i) => (
          <Reveal key={item.title} delayMs={i * 80} className="h-full">
            <IncludedCard
              index={String(i + 1).padStart(2, "0")}
              title={item.title}
            >
              {item.body}
            </IncludedCard>
          </Reveal>
        ))}
      </div>
      <Reveal delayMs={320}>
        <div className="border-hairline mt-11.5 border-t pt-9">
          <Eyebrow className="mb-4">You won&rsquo;t train alone</Eyebrow>
          <div className="grid gap-3 min-[560px]:grid-cols-3">
            {community.map((item) => (
              <div
                key={item.title}
                className="border-hairline rounded-xs border px-4.5 py-4"
              >
                <h3 className="mb-1 text-[1.05rem] font-semibold">
                  {item.title}
                </h3>
                <p className="text-muted text-[0.92rem] leading-[1.55]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
