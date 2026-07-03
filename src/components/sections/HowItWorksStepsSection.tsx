import { Reveal } from "@/components/brand/Reveal";
import { Step, StepList } from "@/components/brand/StepList";
import { Container } from "@/components/layout/Container";
import { howItWorksSteps } from "@/content/marketing";

export function HowItWorksStepsSection() {
  return (
    <section className="relative pb-(--space-section)">
      <Container>
        <StepList className="md:grid-cols-3">
          {howItWorksSteps.map((step, i) => (
            <Reveal key={step.title} delayMs={i * 100}>
              <Step index={String(i + 1).padStart(2, "0")} title={step.title}>
                {step.body}
              </Step>
            </Reveal>
          ))}
        </StepList>
      </Container>
    </section>
  );
}
