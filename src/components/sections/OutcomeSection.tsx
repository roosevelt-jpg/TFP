import { FeatureColumn } from "@/components/brand/FeatureColumn";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Section } from "@/components/layout/Section";
import { benchmarks, outcomes } from "@/content/marketing";

export function OutcomeSection() {
  return (
    <Section divided>
      <SectionHeader
        eyebrow="The outcome"
        heading="What eight weeks actually changes."
        headingChars={28}
        leadChars={50}
        lead="Progressive training and real nutrition targets, built to change what you look like and what you can do."
      />
      <div data-landing-stack className="mt-8 grid gap-2.5 md:grid-cols-3">
        {outcomes.map((item, i) => (
          <Reveal key={item.title} delayMs={i * 60}>
            <FeatureColumn title={item.title}>{item.body}</FeatureColumn>
          </Reveal>
        ))}
      </div>
      <Reveal delayMs={180}>
        <div className="border-hairline mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-3.5">
          <p className="text-muted max-w-[46ch] text-[0.85rem] leading-[1.45]">
            Measured, not guessed: we test four benchmarks in week one and
            re-test them in week eight, from your own starting point.
          </p>
          <ul className="flex flex-wrap gap-2">
            {benchmarks.map((benchmark) => (
              <li
                key={benchmark}
                className="border-hairline-strong rounded-full border px-3 py-1.5 text-[0.78rem]"
                data-landing-chip
              >
                {benchmark}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </Section>
  );
}
