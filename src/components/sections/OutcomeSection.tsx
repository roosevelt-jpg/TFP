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
      <Reveal delayMs={240}>
        <div className="border-hairline mt-11 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t pt-7">
          <p className="text-muted max-w-[46ch] leading-[1.6]">
            Measured, not guessed: we test four benchmarks in week one and
            re-test them in week eight, from your own starting point.
          </p>
          <ul className="flex flex-wrap gap-2.5">
            {benchmarks.map((benchmark) => (
              <li
                key={benchmark}
                className="border-hairline-strong rounded-full border px-4 py-2.25 text-[0.82rem]"
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
