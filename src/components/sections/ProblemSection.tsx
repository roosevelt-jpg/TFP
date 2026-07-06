import { ProblemDiary } from "@/components/brand/ProblemDiary";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Section } from "@/components/layout/Section";

export function ProblemSection() {
  return (
    <Section divided>
      <div className="grid items-center gap-[clamp(34px,5vw,64px)] md:grid-cols-2">
        <div>
          <SectionHeader
            eyebrow="The problem"
            heading="A PDF can’t tell when you quit."
            headingChars={13}
            leadChars={46}
            lead="It can’t see you skipped Monday. It can’t talk you out of the 9pm takeaway. It never messages you on the day you’re ready to pack it in, so it ends up in your downloads, half-read."
          />
          <Reveal delayMs={180}>
            <p className="mt-[26px] text-[1.2rem] leading-[1.45]">
              The fix isn’t more information.
              <br />
              <em className="font-display text-[1.35rem] italic">
                It’s someone who notices.
              </em>
            </p>
          </Reveal>
        </div>
        <Reveal delayMs={120}>
          <ProblemDiary />
        </Reveal>
      </div>
    </Section>
  );
}
