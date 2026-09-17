import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Section } from "@/components/layout/Section";

type Step = { title: string; body: string };

export function CompactHowSection({
  heading,
  steps,
}: {
  heading: string;
  steps: Step[];
}) {
  return (
    <Section id="how" divided>
      <SectionHeader align="center" eyebrow="Simple path" heading={heading} />
      <div className="mx-auto mt-10 grid max-w-[960px] gap-6 min-[720px]:grid-cols-3">
        {steps.map((step, i) => (
          <Reveal key={step.title} delayMs={i * 60}>
            <div className="border-hairline rounded-sm border p-5">
              <div className="text-muted text-[0.75rem] tracking-[0.08em] uppercase">
                Step {i + 1}
              </div>
              <h3 className="mt-2 text-[1.15rem] font-semibold">{step.title}</h3>
              <p className="text-muted mt-2 text-[0.95rem] leading-[1.55]">
                {step.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
