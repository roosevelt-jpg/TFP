import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

// Only routes that actually exist are listed. Funnel pages (/how-it-works,
// /faq, /join, …) are added here as they ship in P2.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
