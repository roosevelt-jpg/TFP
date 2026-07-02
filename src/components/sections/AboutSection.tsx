import { CoachPortrait } from "@/components/brand/CoachPortrait";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { StatBlock } from "@/components/brand/StatBlock";
import { Section } from "@/components/layout/Section";

export function AboutSection() {
  return (
    <Section divided>
      <div className="grid items-center gap-[clamp(32px,5vw,60px)] md:grid-cols-2">
        <Reveal>
          <CoachPortrait
            src="/assets/kane-coach.jpg"
            alt="Kane Mousah flexing at the Bellator weigh-in"
            name="Kane Mousah"
            caption="Ex-pro MMA · Founder, The Formula"
          />
        </Reveal>
        <div>
          <SectionHeader
            eyebrow="Who’s in your corner"
            heading="Coached by someone who’s been in the fight."
            headingChars={15}
            leadChars={48}
            lead="I fought professionally in Bellator — so I know the plan was never the hard part. Turning up when you don’t feel like it is. I built The Formula on that discipline, and I’ve spent years coaching real people through it. This programme points all of that at your next eight weeks."
          />
          <Reveal delayMs={120}>
            <div className="mt-8 grid gap-6 min-[500px]:grid-cols-3">
              <StatBlock value="Ex-pro" caption="MMA fighter" />
              <StatBlock value="Bellator" caption="On the big stage" />
              <StatBlock value="8 weeks" caption="To your turnaround" />
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
