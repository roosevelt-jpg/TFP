import { env } from "@/env";

export const siteConfig = {
  name: "The Formula Programme",
  title: "The Formula Programme",
  description: "An 8-week fitness programme by Kane Mousah.",
  url: env.NEXT_PUBLIC_APP_URL,
  contactEmail: "info@theformulaperformance.com",
  instagramUrl: "https://instagram.com/kanem14",
  // Mux public playback ID for the landing page VSL. Public playback policy, so
  // this is not a secret; the Mux API tokens stay server-side.
  vslPlaybackId: "zyacRHZ02QyUD6gg5TmV5008cLESBdXTuryR5nRX01l00018",
} as const;
