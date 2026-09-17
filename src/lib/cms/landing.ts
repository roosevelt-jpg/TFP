import "server-only";

import { getCmsMap } from "@/lib/cms/store";
import {
  LANDING_CMS_FIELDS,
  type CmsFieldDef,
} from "@/lib/cms/landing-catalog";
import { LANDING_CMS_NAMESPACE } from "@/lib/cms/namespaces";
import { launchCopy } from "@/content/launch-copy";
import { getFounderSeatsRemaining } from "@/lib/cms/landing-seats";

export { getFounderSeatsRemaining };
export { LANDING_CMS_NAMESPACE } from "@/lib/cms/namespaces";

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isOn(value: string) {
  return value === "true" || value === "1" || value === "yes";
}

function fallbackMap(): Record<string, string> {
  return Object.fromEntries(
    LANDING_CMS_FIELDS.map((f: CmsFieldDef) => [f.key, f.fallback]),
  );
}

export type LandingContent = {
  brand: {
    logo: string;
    favicon: string;
    name: string;
    emailLogo: string;
    ogImage: string;
  };
  announcement: { text: string; enabled: boolean };
  hero: {
    eyebrow: string;
    headline: string;
    subhead: string;
    image: string;
    cta: string;
    trust: string;
  };
  vsl: {
    enabled: boolean;
    heading: string;
    lead: string;
    playbackId: string;
    poster: string;
  };
  proof: {
    heading: string;
    lead: string;
    items: Array<{
      quote: string;
      name: string;
      detail?: string;
      featured?: boolean;
      image?: string;
    }>;
  };
  how: {
    enabled: boolean;
    heading: string;
    steps: Array<{ title: string; body: string }>;
  };
  pricing: {
    eyebrow: string;
    heading: string;
    features: string[];
    reassurance: string;
  };
  faq: {
    heading: string;
    items: Array<{ q: string; a: string }>;
  };
  final: { heading: string; body: string; cta: string };
  sticky: { label: string; secondary: string };
  footer: { tagline: string; disclaimer: string };
};

/** Full landing payload — every public string/image from CMS with catalog defaults. */
export async function getLandingContent(): Promise<LandingContent> {
  const stored = await getCmsMap(LANDING_CMS_NAMESPACE);
  const defaults = fallbackMap();
  const v = (key: string) => stored[key] ?? defaults[key] ?? "";

  return {
    brand: {
      logo: v("brand.logo") || "/logo.svg",
      favicon: v("brand.favicon") || "/favicon.ico",
      name: v("brand.name") || "The Formula Programme",
      emailLogo: v("brand.emailLogo") || "/email/logo.png",
      ogImage: v("brand.ogImage"),
    },
    announcement: {
      text: v("announcement") || launchCopy.announcement,
      enabled: isOn(v("announcement.enabled") || "true"),
    },
    hero: {
      eyebrow: v("hero.eyebrow"),
      headline: v("hero.headline"),
      subhead: v("hero.subhead"),
      image: v("hero.image"),
      cta: v("cta") || launchCopy.cta,
      trust: v("hero.trust") || launchCopy.heroTrust,
    },
    vsl: {
      enabled: isOn(v("vsl.enabled") || "false"),
      heading: v("vsl.heading"),
      lead: v("vsl.lead"),
      playbackId: v("vsl.playbackId"),
      poster: v("vsl.poster"),
    },
    proof: {
      heading: v("proof.heading"),
      lead: v("proof.lead"),
      items: parseJson(v("proof.items"), []),
    },
    how: {
      enabled: isOn(v("how.enabled") || "true"),
      heading: v("how.heading"),
      steps: parseJson(v("how.steps"), []),
    },
    pricing: {
      eyebrow: v("pricing.eyebrow"),
      heading: v("pricing.heading"),
      features: parseJson(v("pricing.features"), []),
      reassurance: v("pricing.reassurance") || launchCopy.reassurance,
    },
    faq: {
      heading: v("faq.heading"),
      items: parseJson(v("faq.items"), []),
    },
    final: {
      heading: v("final.heading"),
      body: v("finalCta") || launchCopy.finalCta,
      cta: v("cta") || launchCopy.cta,
    },
    sticky: {
      label: v("stickyLabel") || launchCopy.stickyLabel,
      secondary: v("stickySecondary") || launchCopy.stickySecondary,
    },
    footer: {
      tagline: v("footer.tagline"),
      disclaimer: v("footer.disclaimer"),
    },
  };
}

/** Compat for older call sites. */
export async function getLandingCopy() {
  const c = await getLandingContent();
  return {
    announcement: c.announcement.text,
    heroHeadline: c.hero.headline,
    heroSubhead: c.hero.subhead,
    cta: c.hero.cta,
    stickyLabel: c.sticky.label,
    stickySecondary: c.sticky.secondary,
    finalCta: c.final.body,
    reassurance: c.pricing.reassurance,
    heroTrust: c.hero.trust,
  };
}
