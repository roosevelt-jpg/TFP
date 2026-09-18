import "server-only";

import { db } from "@/db";
import { env } from "@/env";
import {
  isWhatsAppTemplateKey,
  type WhatsAppTemplateKey,
} from "@/lib/whatsapp/templates-keys";

export {
  WHATSAPP_TEMPLATE_KEYS,
  isWhatsAppTemplateKey,
  type WhatsAppTemplateKey,
} from "@/lib/whatsapp/templates-keys";

export type MetaTemplateChannel = "whatsapp" | "instagram";
export type HeaderMediaType = "none" | "image" | "video" | "document";

export type WhatsAppTemplateDef = {
  key: string;
  channel: MetaTemplateChannel;
  /** Meta WA template name (must match Business Manager exactly). */
  name: string;
  language: string;
  bodyText: string | null;
  bodyVars: number;
  buttonUrlCount: number;
  headerMediaType: HeaderMediaType;
  headerMediaUrl: string | null;
  enabled: boolean;
  version: number;
};

const ENV_FALLBACK: Record<
  WhatsAppTemplateKey,
  { name: string; bodyVars: number; buttonUrlCount: number }
> = {
  waitlist_welcome: {
    name: env.WHATSAPP_TEMPLATE_WAITLIST_WELCOME ?? "waitlist_welcome",
    bodyVars: 1,
    buttonUrlCount: 0,
  },
  checkout_recovery: {
    name: env.WHATSAPP_TEMPLATE_CHECKOUT_RECOVERY ?? "checkout_recovery",
    bodyVars: 1,
    buttonUrlCount: 1,
  },
  purchase_confirmation: {
    name: env.WHATSAPP_TEMPLATE_PURCHASE_CONFIRMATION ?? "purchase_confirmation",
    bodyVars: 1,
    buttonUrlCount: 1,
  },
  purchase_activation: {
    name: env.WHATSAPP_TEMPLATE_PURCHASE_ACTIVATION ?? "purchase_activation",
    bodyVars: 1,
    buttonUrlCount: 1,
  },
  activation_reminder: {
    name: env.WHATSAPP_TEMPLATE_ACTIVATION_REMINDER ?? "activation_reminder",
    bodyVars: 1,
    buttonUrlCount: 1,
  },
  service_registered: {
    name: env.WHATSAPP_TEMPLATE_SERVICE_REGISTERED ?? "service_registered",
    bodyVars: 1,
    buttonUrlCount: 0,
  },
};

export const DEFAULT_WHATSAPP_SEEDS: Array<{
  key: WhatsAppTemplateKey;
  label: string;
  description: string;
  triggerHint: string;
  category: string;
  bodyVars: number;
  buttonUrlCount: number;
}> = [
  {
    key: "waitlist_welcome",
    label: "Waitlist welcome",
    description: "Sent when someone joins the waitlist with WhatsApp + consent.",
    triggerHint: "Waitlist register → CRM whatsapp number",
    category: "lifecycle",
    bodyVars: 1,
    buttonUrlCount: 0,
  },
  {
    key: "checkout_recovery",
    label: "Checkout recovery",
    description: "24h abandoned-checkout nudge with complete-checkout URL button.",
    triggerHint: "Checkout abandoned (24h) → CRM whatsapp",
    category: "lifecycle",
    bodyVars: 1,
    buttonUrlCount: 1,
  },
  {
    key: "purchase_confirmation",
    label: "Purchase confirmation",
    description: "Order received — confirmation with success URL button.",
    triggerHint: "Payment succeeded → Customer.whatsapp",
    category: "utility",
    bodyVars: 1,
    buttonUrlCount: 1,
  },
  {
    key: "purchase_activation",
    label: "Purchase activation",
    description: "Start coaching — open success link / message coach.",
    triggerHint: "Payment succeeded → Customer.whatsapp",
    category: "utility",
    bodyVars: 1,
    buttonUrlCount: 1,
  },
  {
    key: "activation_reminder",
    label: "Activation reminder",
    description: "24h after purchase if coaching intake is still incomplete.",
    triggerHint: "Onboarding incomplete (24h) → Customer.whatsapp",
    category: "utility",
    bodyVars: 1,
    buttonUrlCount: 1,
  },
  {
    key: "service_registered",
    label: "Service registered",
    description: "Confirmation when coaching intake completes.",
    triggerHint: "Coaching profile saved → Customer.whatsapp",
    category: "utility",
    bodyVars: 1,
    buttonUrlCount: 0,
  },
];

export const DEFAULT_INSTAGRAM_SEEDS: Array<{
  key: string;
  label: string;
  description: string;
  triggerHint: string;
  category: string;
  bodyText: string;
  bodyVars: number;
}> = [
  {
    key: "ig_inbound_ack",
    label: "IG inbound auto-ack",
    description: "Auto-reply when someone DMs the business Instagram.",
    triggerHint: "Instagram inbound DM",
    category: "lifecycle",
    bodyText:
      "Thanks — the Formula team has your message. For coaching, WhatsApp is fastest once you’re on the programme.",
    bodyVars: 0,
  },
  {
    key: "ig_high_intent",
    label: "IG high-intent nudge",
    description: "Follow-up when a DM looks like purchase intent.",
    triggerHint: "Instagram high-intent keyword",
    category: "lifecycle",
    bodyText:
      "Want the programme details? Reply here or join via the link in bio — we’ll get you set up on WhatsApp.",
    bodyVars: 0,
  },
];

function asMediaType(value: string | null | undefined): HeaderMediaType {
  if (value === "image" || value === "video" || value === "document") {
    return value;
  }
  return "none";
}

function asChannel(value: string | null | undefined): MetaTemplateChannel {
  return value === "instagram" ? "instagram" : "whatsapp";
}

/** Ensure seed rows exist (idempotent) — called from admin page load. */
export async function ensureMetaTemplateSeeds() {
  for (const seed of DEFAULT_WHATSAPP_SEEDS) {
    const fallback = ENV_FALLBACK[seed.key];
    await db.messageTemplate.upsert({
      where: { key: seed.key },
      create: {
        channel: "whatsapp",
        key: seed.key,
        label: seed.label,
        description: seed.description,
        metaName: fallback.name,
        language: "en_GB",
        bodyVars: seed.bodyVars,
        buttonUrlCount: seed.buttonUrlCount,
        headerMediaType: "none",
        category: seed.category,
        triggerHint: seed.triggerHint,
        enabled: true,
        version: 1,
      },
      update: {},
    });
  }

  for (const seed of DEFAULT_INSTAGRAM_SEEDS) {
    await db.messageTemplate.upsert({
      where: { key: seed.key },
      create: {
        channel: "instagram",
        key: seed.key,
        label: seed.label,
        description: seed.description,
        metaName: seed.key,
        language: "en_GB",
        bodyText: seed.bodyText,
        bodyVars: seed.bodyVars,
        buttonUrlCount: 0,
        headerMediaType: "none",
        category: seed.category,
        triggerHint: seed.triggerHint,
        enabled: true,
        version: 1,
      },
      update: {},
    });
  }
}

export async function listMetaTemplates(channel?: MetaTemplateChannel) {
  await ensureMetaTemplateSeeds();
  return db.messageTemplate.findMany({
    where: channel ? { channel } : undefined,
    orderBy: [{ channel: "asc" }, { key: "asc" }],
  });
}

/** @deprecated prefer listMetaTemplates("whatsapp") */
export async function listWhatsAppTemplates() {
  return listMetaTemplates("whatsapp");
}

export async function ensureWhatsAppTemplateSeeds() {
  return ensureMetaTemplateSeeds();
}

/**
 * Resolve a template for send. Prefers admin DB row; falls back to env for
 * wired WA keys. Disabled rows return enabled:false so the sender can skip.
 */
export async function getWhatsAppTemplate(
  key: string,
): Promise<WhatsAppTemplateDef> {
  try {
    const row = await db.messageTemplate.findUnique({ where: { key } });
    if (row) {
      return {
        key: row.key,
        channel: asChannel(row.channel),
        name: row.metaName,
        language: row.language,
        bodyText: row.bodyText,
        bodyVars: row.bodyVars,
        buttonUrlCount: row.buttonUrlCount,
        headerMediaType: asMediaType(row.headerMediaType),
        headerMediaUrl: row.headerMediaUrl,
        enabled: row.enabled,
        version: row.version,
      };
    }
  } catch {
    // DB unavailable during migrate — use env for known keys.
  }

  if (isWhatsAppTemplateKey(key)) {
    const fallback = ENV_FALLBACK[key];
    return {
      key,
      channel: "whatsapp",
      name: fallback.name,
      language: "en_GB",
      bodyText: null,
      bodyVars: fallback.bodyVars,
      buttonUrlCount: fallback.buttonUrlCount,
      headerMediaType: "none",
      headerMediaUrl: null,
      enabled: true,
      version: 0,
    };
  }

  return {
    key,
    channel: "whatsapp",
    name: key,
    language: "en_GB",
    bodyText: null,
    bodyVars: 1,
    buttonUrlCount: 0,
    headerMediaType: "none",
    headerMediaUrl: null,
    enabled: false,
    version: 0,
  };
}

export async function getMetaTemplate(key: string) {
  return getWhatsAppTemplate(key);
}

/** Substitute {{1}}, {{2}}, … in IG body text. */
export function renderTemplateBody(
  body: string,
  params: string[] = [],
): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n: string) => {
    const idx = Number(n) - 1;
    return params[idx] ?? "";
  });
}

export const WHATSAPP_OPT_OUT_KEYWORDS = [
  "stop",
  "unsubscribe",
  "cancel",
  "opt out",
  "optout",
] as const;

export function isWhatsAppOptOutText(text: string) {
  const normalized = text.trim().toLowerCase();
  return WHATSAPP_OPT_OUT_KEYWORDS.some(
    (k) => normalized === k || normalized.startsWith(`${k} `),
  );
}
