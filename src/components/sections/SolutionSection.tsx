import { BrandChat } from "@/components/brand/BrandChat";
import { FeatureRow } from "@/components/brand/FeatureRow";
import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Section } from "@/components/layout/Section";
import { solutionChat } from "@/content/chat-scripts";
import { coachCapabilities } from "@/content/marketing";

export function SolutionSection() {
  return (
    <Section id="how" divided>
      <SectionHeader
        eyebrow="The difference"
        heading="This one messages first."
        headingChars={16}
        lead="Not a file you forget. It’s me — coaching you in the one app you already check fifty times a day, trained on exactly how I program, feed and push my own athletes."
      />
      <div className="mt-[54px] grid items-start gap-[clamp(32px,5vw,64px)] md:grid-cols-2">
        <div>
          {coachCapabilities.map((cap, i) => (
            <Reveal key={cap.title} delayMs={i * 70}>
              <FeatureRow title={cap.title}>{cap.body}</FeatureRow>
            </Reveal>
          ))}
        </div>
        <Reveal delayMs={120}>
          <BrandChat
            animated
            messages={solutionChat}
            header={{
              name: "Kane · Your Coach",
              status: "typically replies in seconds",
              online: false,
              avatar: "/assets/kane-headshot.png",
            }}
          />
        </Reveal>
      </div>
    </Section>
  );
}
