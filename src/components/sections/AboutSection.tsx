import { CoachPortrait } from "@/components/brand/CoachPortrait";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { StatBlock } from "@/components/brand/StatBlock";
import { Section } from "@/components/layout/Section";
import { siteConfig } from "@/config/site";

export function AboutSection() {
  return (
    <Section divided>
      <div className="grid items-center gap-[clamp(14px,2.5vw,28px)] md:grid-cols-2">
        <Reveal>
          <CoachPortrait
            src="/assets/kane-coach.jpg"
            alt="Kane Mousah flexing at the Bellator weigh-in"
            name="Kane Mousah"
            caption="Ex-pro MMA · Founder, The Formula"
            follower={{ count: "132K", href: siteConfig.instagramUrl }}
          />
        </Reveal>
        <div>
          <SectionHeader
            eyebrow="Who’s in your corner"
            heading="Coached by someone who’s been in the fight."
            headingChars={18}
            leadChars={48}
            lead="I fought pro MMA in Bellator, then spent 20+ years coaching. I founded The Formula and built the accountability system behind it myself."
          />
          <Reveal delayMs={120}>
            <div className="mt-4 grid gap-3 min-[500px]:grid-cols-3">
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
