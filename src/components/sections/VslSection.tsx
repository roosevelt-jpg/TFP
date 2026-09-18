import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { VslPlayer } from "@/components/brand/VslPlayer";
import { Section } from "@/components/layout/Section";
import { siteConfig } from "@/config/site";

type Props = {
  heading?: string;
  lead?: string;
  playbackId?: string;
  poster?: string;
};

export function VslSection({
  heading = "Hear it from Kane.",
  lead = "Five minutes on how the programme works and who it is for.",
  playbackId = siteConfig.vslPlaybackId,
  poster,
}: Props) {
  const posterUrl =
    poster ||
    `https://image.mux.com/${playbackId}/thumbnail.webp?time=3`;

  return (
    <Section divided id="watch">
      <SectionHeader
        align="center"
        eyebrow="Watch first"
        heading={heading}
        headingChars={28}
        leadChars={52}
        lead={lead}
      />
      <Reveal>
        <div
          data-landing-stack
          className="border-hairline-strong mx-auto aspect-video w-full max-w-[820px] overflow-hidden rounded-sm border"
        >
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
