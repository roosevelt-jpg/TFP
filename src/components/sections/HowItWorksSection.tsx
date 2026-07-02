import { MeasuredProgress } from "@/components/brand/MeasuredProgress";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Step, StepList } from "@/components/brand/StepList";
import { Section } from "@/components/layout/Section";
import { benchmarks, steps } from "@/content/marketing";

export function HowItWorksSection() {
  return (
    <Section divided>
      <SectionHeader
        align="center"
        eyebrow="How it works"
        heading="Up and running in minutes."
      />
      <StepList className="mt-14 md:grid-cols-3">
        {steps.map((step, i) => (
          <Reveal key={step.title} delayMs={i * 100}>
            <Step index={String(i + 1).padStart(2, "0")} title={step.title}>
              {step.body}
            </Step>
          </Reveal>
        ))}
      </StepList>
      <Reveal>
        <MeasuredProgress benchmarks={benchmarks} />
      </Reveal>
    </Section>
  );
}
