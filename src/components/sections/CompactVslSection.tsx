import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { VslPlayer } from "@/components/brand/VslPlayer";
import { Section } from "@/components/layout/Section";

export function CompactVslSection({
  heading,
  lead,
  playbackId,
  poster,
}: {
  heading: string;
  lead: string;
  playbackId: string;
  poster?: string;
}) {
  const posterUrl =
    poster ||
    `https://image.mux.com/${playbackId}/thumbnail.webp?time=3`;

  return (
    <Section divided id="watch" className="py-[clamp(48px,6vw,72px)]">
      <SectionHeader
        eyebrow="Watch"
        heading={heading}
        lead={lead}
        align="center"
      />
      <Reveal>
        <div className="border-hairline-strong mx-auto mt-6 aspect-video max-w-[720px] overflow-hidden rounded-sm border">
          <VslPlayer
            playbackId={playbackId}
            poster={posterUrl}
            title={heading}
          />
        </div>
      </Reveal>
    </Section>
  );
}
