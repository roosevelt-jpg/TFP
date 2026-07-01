import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

// AI answer-engine crawlers are explicitly welcomed (AEO/GEO): being cited by
// ChatGPT, Perplexity, and Google's AI surfaces is a distribution channel.
const aiCrawlers = ["GPTBot", "PerplexityBot", "Google-Extended", "ClaudeBot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/api/" },
      ...aiCrawlers.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
