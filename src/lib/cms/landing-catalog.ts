import { launchCopy } from "@/content/launch-copy";
import { faqs } from "@/content/faqs";
import { testimonials } from "@/content/testimonials";
import { pricingFeatures } from "@/content/marketing";
import { LANDING_CMS_NAMESPACE } from "@/lib/cms/namespaces";

export { LANDING_CMS_NAMESPACE };

export type CmsFieldKind = "text" | "textarea" | "image" | "toggle" | "json";

export type CmsFieldDef = {
  key: string;
  label: string;
  kind: CmsFieldKind;
  group: string;
  fallback: string;
  help?: string;
};

/** Every marketing + brand surface Kane can edit. No hardcoded landing copy remains. */
export const LANDING_CMS_FIELDS: CmsFieldDef[] = [
  // Brand
  {
    key: "brand.logo",
    label: "Site logo (header)",
    kind: "image",
    group: "Brand",
    fallback: "/logo.svg",
    help: "PNG, SVG or WebP. Shown in the site header.",
  },
  {
    key: "brand.favicon",
    label: "Favicon",
    kind: "image",
    group: "Brand",
    fallback: "/favicon.ico",
  },
  {
    key: "brand.name",
    label: "Brand name",
    kind: "text",
    group: "Brand",
    fallback: "The Formula Programme",
  },
  {
    key: "brand.emailLogo",
    label: "Email logo (PNG)",
    kind: "image",
    group: "Brand",
    fallback: "/email/logo.png",
    help: "Used as the CID attachment in every branded email. PNG preferred.",
  },
  {
    key: "brand.ogImage",
    label: "Open Graph / share image",
    kind: "image",
    group: "Brand",
    fallback: "",
    help: "Optional. Shown when the site is shared on social.",
  },

  // Announcement
  {
    key: "announcement",
    label: "Announcement bar",
    kind: "text",
    group: "Announcement",
    fallback: launchCopy.announcement,
  },
  {
    key: "announcement.enabled",
    label: "Show announcement bar",
    kind: "toggle",
    group: "Announcement",
    fallback: "true",
  },

  // Hero
  {
    key: "hero.eyebrow",
    label: "Hero eyebrow",
    kind: "text",
    group: "Hero",
    fallback: "8-week programme · Founder launch",
  },
  {
    key: "hero.headline",
    label: "Hero headline",
    kind: "textarea",
    group: "Hero",
    fallback:
      "Lose fat. Build muscle. Become stronger, fitter and more functional in 8 weeks.",
  },
  {
    key: "hero.subhead",
    label: "Hero supporting line",
    kind: "textarea",
    group: "Hero",
    fallback:
      "An 8-week training system with your own Performance Coach inside WhatsApp.",
  },
  {
    key: "hero.image",
    label: "Hero image",
    kind: "image",
    group: "Hero",
    fallback: "",
    help: "Optional. Leave empty to use the phone mockup.",
  },
  {
    key: "cta",
    label: "Primary CTA label",
    kind: "text",
    group: "Hero",
    fallback: launchCopy.cta,
  },
  {
    key: "hero.trust",
    label: "Hero trust line",
    kind: "text",
    group: "Hero",
    fallback: launchCopy.heroTrust,
  },

  // Video
  {
    key: "vsl.enabled",
    label: "Show short video section",
    kind: "toggle",
    group: "Video",
    fallback: "true",
    help: "On by default. Turn off only if you want to hide the VSL.",
  },
  {
    key: "vsl.heading",
    label: "Video heading",
    kind: "text",
    group: "Video",
    fallback: "Hear it from Kane.",
  },
  {
    key: "vsl.lead",
    label: "Video lead",
    kind: "textarea",
    group: "Video",
    fallback: "Five minutes on how the programme works and who it is for.",
  },
  {
    key: "vsl.playbackId",
    label: "Mux playback ID",
    kind: "text",
    group: "Video",
    fallback: "zyacRHZ02QyUD6gg5TmV5008cLESBdXTuryR5nRX01l00018",
  },
  {
    key: "vsl.poster",
    label: "Video poster image",
    kind: "image",
    group: "Video",
    fallback: "",
  },

  // Proof
  {
    key: "proof.heading",
    label: "Proof heading",
    kind: "text",
    group: "Proof",
    fallback: "Real people. Real results.",
  },
  {
    key: "proof.lead",
    label: "Proof lead",
    kind: "textarea",
    group: "Proof",
    fallback: "Permission-backed transformations from the programme.",
  },
  {
    key: "proof.items",
    label: "Testimonials (JSON array)",
    kind: "json",
    group: "Proof",
    fallback: JSON.stringify(
      testimonials.map((t) => ({
        quote: t.quote,
        name: t.name,
        detail: t.detail ?? "",
        featured: Boolean(t.featured),
        image: "",
      })),
      null,
      2,
    ),
    help: '[{ "quote", "name", "detail", "featured", "image" }]',
  },

  // How it works
  {
    key: "how.enabled",
    label: "Show how-it-works",
    kind: "toggle",
    group: "How it works",
    fallback: "true",
  },
  {
    key: "how.heading",
    label: "How-it-works heading",
    kind: "text",
    group: "How it works",
    fallback: "How it works",
  },
  {
    key: "how.steps",
    label: "Steps (JSON array)",
    kind: "json",
    group: "How it works",
    fallback: JSON.stringify(
      [
        {
          title: launchCopy.steps.one.title,
          body: launchCopy.steps.one.body,
        },
        {
          title: launchCopy.steps.two.title,
          body: launchCopy.steps.two.body,
        },
        {
          title: "Show up",
          body: "Train, check in on WhatsApp, and finish the eight weeks with a coach that does not quit.",
        },
      ],
      null,
      2,
    ),
  },

  // Pricing
  {
    key: "pricing.eyebrow",
    label: "Pricing eyebrow",
    kind: "text",
    group: "Pricing",
    fallback: "Simple, honest pricing",
  },
  {
    key: "pricing.heading",
    label: "Pricing heading",
    kind: "text",
    group: "Pricing",
    fallback: "One price. No surprises.",
  },
  {
    key: "pricing.features",
    label: "Pricing features (JSON string array)",
    kind: "json",
    group: "Pricing",
    fallback: JSON.stringify(pricingFeatures, null, 2),
  },
  {
    key: "pricing.reassurance",
    label: "Pricing reassurance",
    kind: "textarea",
    group: "Pricing",
    fallback: launchCopy.reassurance,
  },

  // FAQ
  {
    key: "faq.heading",
    label: "FAQ heading",
    kind: "text",
    group: "FAQ",
    fallback: "Questions, answered.",
  },
  {
    key: "faq.items",
    label: "FAQ items (JSON)",
    kind: "json",
    group: "FAQ",
    fallback: JSON.stringify(
      faqs
        .filter((f) => f.featured)
        .map((f) => ({ q: f.q, a: f.a })),
      null,
      2,
    ),
  },

  // Final CTA
  {
    key: "final.heading",
    label: "Final CTA heading",
    kind: "text",
    group: "Final CTA",
    fallback: "Your next eight weeks start with one decision.",
  },
  {
    key: "finalCta",
    label: "Final CTA body",
    kind: "textarea",
    group: "Final CTA",
    fallback: launchCopy.finalCta,
  },

  // Sticky
  {
    key: "stickyLabel",
    label: "Sticky bar primary",
    kind: "text",
    group: "Sticky bar",
    fallback: launchCopy.stickyLabel,
  },
  {
    key: "stickySecondary",
    label: "Sticky bar secondary",
    kind: "text",
    group: "Sticky bar",
    fallback: launchCopy.stickySecondary,
  },

  // Footer / legal
  {
    key: "footer.tagline",
    label: "Footer tagline",
    kind: "textarea",
    group: "Footer",
    fallback:
      "The 8-week programme plus your Performance Coach in WhatsApp. The method behind The Formula, pointed at your next eight weeks.",
  },
  {
    key: "footer.disclaimer",
    label: "Footer disclaimer",
    kind: "textarea",
    group: "Footer",
    fallback:
      "Your Performance Coach is an AI trained on Kane's coaching style, not a live person. Results vary. Not medical advice; consult a professional before starting any programme.",
  },
];

export function groupLandingFields() {
  const groups = new Map<string, CmsFieldDef[]>();
  for (const field of LANDING_CMS_FIELDS) {
    const list = groups.get(field.group) ?? [];
    list.push(field);
    groups.set(field.group, list);
  }
  return [...groups.entries()];
}
