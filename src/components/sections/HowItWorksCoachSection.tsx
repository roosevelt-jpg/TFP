import { BrandChat } from "@/components/brand/BrandChat";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { FeatureRow } from "@/components/brand/FeatureRow";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeading } from "@/components/brand/SectionHeading";
import { Container } from "@/components/layout/Container";
import { solutionChat } from "@/content/chat-scripts";
import { coachCapabilities } from "@/content/marketing";

export function HowItWorksCoachSection() {
  return (
    <section className="bg-bg-2 border-hairline relative border-y py-(--space-section)">
      <Container>
        <Reveal>
          <Eyebrow>What your coach does</Eyebrow>
        </Reveal>
        <Reveal delayMs={60}>
          <SectionHeading className="mt-3.5 max-w-[18ch]">
            Trained on how Kane <em>actually coaches.</em>
          </SectionHeading>
        </Reveal>
        <div className="mt-[46px] grid items-start gap-[clamp(32px,5vw,64px)] min-[820px]:grid-cols-2">
          <div>
            {coachCapabilities.map((cap, i) => (
              <Reveal key={cap.title} delayMs={i * 70}>
                <FeatureRow title={cap.title}>{cap.body}</FeatureRow>
              </Reveal>
            ))}
          </div>
          <Reveal delayMs={120}>
            <BrandChat
              translucent={false}
              messages={solutionChat}
              header={{
                name: "Kane · Your Coach",
                status: "connects when you start",
                online: false,
                avatar: "/assets/kane-headshot.png",
              }}
            />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
