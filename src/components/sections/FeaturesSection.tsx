import { IncludedCard } from "@/components/brand/IncludedCard";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Section } from "@/components/layout/Section";
import { features } from "@/content/marketing";

export function FeaturesSection() {
  return (
    <Section divided>
      <SectionHeader
        eyebrow="How it works"
        heading="Your Performance Coach, inside WhatsApp"
        headingChars={28}
        leadChars={52}
        lead="One number to save. For eight weeks it's how you train, eat and stay on track, all in the app you already have open."
      />
      <div
        data-landing-stack
        className="mt-8 grid items-stretch gap-2.5 md:grid-cols-2"
      >
        {features.map((item, i) => (
          <Reveal key={item.title} delayMs={i * 60} className="h-full">
            <IncludedCard
              index={String(i + 1).padStart(2, "0")}
              title={item.title}
            >
              {item.body}
            </IncludedCard>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
