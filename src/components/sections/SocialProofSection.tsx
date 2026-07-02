import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Testimonial } from "@/components/brand/Testimonial";
import { Section } from "@/components/layout/Section";
import { testimonials } from "@/content/testimonials";

export function SocialProofSection() {
  return (
    <Section divided>
      <SectionHeader
        eyebrow="Don't take my word for it"
        heading="Real people. Real change."
      />
      <div className="mt-[46px] grid items-start gap-[14px] md:grid-cols-3">
        {testimonials.map((t, i) => (
          <Reveal key={t.name} delayMs={i * 90}>
            <Testimonial {...t} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
