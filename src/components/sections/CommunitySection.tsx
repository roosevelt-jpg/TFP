import { FeatureColumn } from "@/components/brand/FeatureColumn";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Section } from "@/components/layout/Section";
import { community } from "@/content/marketing";

export function CommunitySection() {
  return (
    <Section divided>
      <SectionHeader
        eyebrow="The community"
        heading={
          <>
            You won’t train <em>alone.</em>
          </>
        }
        headingChars={16}
        lead="Everyone on the programme trains to the same standard and holds the same line. A private community that keeps you honest on the days motivation won’t, because the work is easier when you’re not the only one doing it."
      />
      <div className="mt-11 grid gap-[14px] md:grid-cols-3">
        {community.map((item, i) => (
          <Reveal key={item.title} delayMs={i * 80}>
            <FeatureColumn title={item.title}>{item.body}</FeatureColumn>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
