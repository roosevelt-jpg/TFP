"use client";

// Mux's own lazy entry point: it defers the player bundle until the placeholder
// scrolls into view. The aspectRatio style is required, not cosmetic — without
// it the late-loading player pushes the page down (Mux's lazy-loading guide).
import MuxPlayer from "@mux/mux-player-react/lazy";

type VslPlayerProps = {
  playbackId: string;
  poster: string;
  title: string;
};

export function VslPlayer({ playbackId, poster, title }: VslPlayerProps) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      poster={poster}
      title={title}
      accentColor="#d8231c"
      // Captions stay available in the controls, just off until asked for.
      defaultHiddenCaptions
      metadata={{ video_title: title }}
      style={{ aspectRatio: "16 / 9", width: "100%" }}
    />
  );
}
