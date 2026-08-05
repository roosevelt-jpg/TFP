import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { VslPlayer } from "@/components/brand/VslPlayer";
import { Section } from "@/components/layout/Section";
import { siteConfig } from "@/config/site";

const VSL_TITLE = "Kane explains The Formula";

export function VslSection() {
  // Tighter than --space-section: the video is the content, so the usual
  // section padding left it marooned in empty space.
  return (
    <Section divided id="watch" className="py-[clamp(56px,7vw,88px)]">
      <SectionHeader
        eyebrow="Watch first"
        heading="Hear it from Kane."
        headingChars={20}
        leadChars={46}
        lead="Five minutes on how the programme works and who it is for."
      />
      <Reveal>
        {/* aspect-video on the wrapper too: the lazy player's own placeholder
            only reserves space once its bundle mounts, so without this the
            container collapses and the sections below jump. */}
        <div className="border-hairline-strong mx-auto mt-7 aspect-video max-w-260 overflow-hidden rounded-sm border">
          <VslPlayer
            playbackId={siteConfig.vslPlaybackId}
            poster={`https://image.mux.com/${siteConfig.vslPlaybackId}/thumbnail.webp?time=3`}
            title={VSL_TITLE}
          />
        </div>
      </Reveal>
    </Section>
  );
}
