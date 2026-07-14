import { env } from "@/env";

export const siteConfig = {
  name: "The Formula Programme",
  title: "The Formula Programme",
  description: "An 8-week fitness programme by Kane Mousah.",
  url: env.NEXT_PUBLIC_APP_URL,
  contactEmail: "info@theformulaperformance.com",
  instagramUrl: "https://instagram.com/kanem14",
} as const;
