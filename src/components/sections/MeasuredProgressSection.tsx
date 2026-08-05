import { MeasuredProgress } from "@/components/brand/MeasuredProgress";
import { Reveal } from "@/components/brand/Reveal";
import { Section } from "@/components/layout/Section";
import { benchmarks } from "@/content/marketing";

export function MeasuredProgressSection() {
  // No `divided` and no top padding: MeasuredProgress renders its own top
  // hairline and spacing, so Section's would double both.
  return (
    <Section className="pt-0">
      <Reveal>
        <MeasuredProgress benchmarks={benchmarks} />
      </Reveal>
    </Section>
  );
}
