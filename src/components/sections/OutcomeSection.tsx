import { FeatureColumn } from "@/components/brand/FeatureColumn";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Section } from "@/components/layout/Section";
import { outcomes } from "@/content/marketing";

export function OutcomeSection() {
  return (
    <Section divided>
      <SectionHeader
        eyebrow="The outcome"
        heading="What eight weeks actually changes."
        headingChars={24}
        leadChars={50}
        lead="Progressive training and real nutrition targets, built to change what you look like and what you can do."
      />
      <div className="mt-11 grid gap-3.5 md:grid-cols-3">
        {outcomes.map((item, i) => (
          <Reveal key={item.title} delayMs={i * 80}>
            <FeatureColumn title={item.title}>{item.body}</FeatureColumn>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
