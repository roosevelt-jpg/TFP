export type CredentialField = {
  key: string;
  label: string;
  secret: boolean;
  placeholder?: string;
};

export type CredentialGroup = {
  id: string;
  name: string;
  description: string;
  fields: CredentialField[];
};

/** Kane-managed connector credentials shown on /admin/integrations. */
export const CREDENTIAL_GROUPS: CredentialGroup[] = [
  {
    id: "S1",
    name: "Shopify",
    description: "Admin GraphQL — orders and customers",
    fields: [
      {
        key: "SHOPIFY_SHOP_DOMAIN",
        label: "Shop domain",
        secret: false,
        placeholder: "your-shop.myshopify.com",
      },
      { key: "SHOPIFY_ADMIN_TOKEN", label: "Admin API token", secret: true },
    ],
  },
  {
    id: "S2",
    name: "Stripe",
    description: "Payments mirror (also used by checkout)",
    fields: [
      { key: "STRIPE_SECRET_KEY", label: "Secret / restricted key", secret: true },
      { key: "STRIPE_WEBHOOK_SECRET", label: "Webhook signing secret", secret: true },
    ],
  },
  {
    id: "S3",
    name: "Meta Ads",
    description: "Marketing API — ad spend and ROAS",
    fields: [
      { key: "META_ACCESS_TOKEN", label: "Access token", secret: true },
      {
        key: "META_AD_ACCOUNT_ID",
        label: "Ad account ID",
        secret: false,
        placeholder: "act_…",
      },
    ],
  },
  {
    id: "S4",
    name: "Klaviyo",
    description: "Email performance daily",
    fields: [{ key: "KLAVIYO_API_KEY", label: "Private API key", secret: true }],
  },
  {
    id: "S5",
    name: "GoHighLevel",
    description: "CRM + conversation threads",
    fields: [
      {
        key: "GHL_INTEGRATION_TOKEN",
        label: "Private integration token",
        secret: true,
      },
      { key: "GHL_LOCATION_ID", label: "Location / sub-account ID", secret: false },
    ],
  },
  {
    id: "S6",
    name: "n8n",
    description: "Workflow health checks",
    fields: [
      {
        key: "N8N_API_URL",
        label: "API base URL",
        secret: false,
        placeholder: "https://n8n.example.com",
      },
      { key: "N8N_API_KEY", label: "API key", secret: true },
    ],
  },
  {
    id: "S7",
    name: "Gmail",
    description: "Support inbox mirror (OAuth read)",
    fields: [
      { key: "GMAIL_CLIENT_ID", label: "OAuth client ID", secret: false },
      { key: "GMAIL_CLIENT_SECRET", label: "OAuth client secret", secret: true },
      { key: "GMAIL_REFRESH_TOKEN", label: "Refresh token", secret: true },
    ],
  },
  {
    id: "Mail",
    name: "Mail drivers",
    description:
      "Gmail SMTP for admin invites (preferred); Resend for client emails. Either can fall back to the other.",
    fields: [
      {
        key: "GMAIL_SMTP_USER",
        label: "Gmail SMTP user / address",
        secret: false,
        placeholder: "you@gmail.com",
      },
      {
        key: "GMAIL_SMTP_PASS",
        label: "Gmail app password",
        secret: true,
        placeholder: "16-char app password",
      },
      {
        key: "GMAIL_SMTP_FROM",
        label: "Gmail From (optional)",
        secret: false,
        placeholder: "TFP Command <you@gmail.com>",
      },
      { key: "RESEND_API_KEY", label: "Resend API key", secret: true },
      {
        key: "RESEND_FROM",
        label: "Resend From",
        secret: false,
        placeholder: "The Formula Programme <hello@…>",
      },
    ],
  },
  {
    id: "Funnel",
    name: "Funnel & channels",
    description: "Complete Stack URLs, Meta inbound, Telegram bot username",
    fields: [
      {
        key: "COMPLETE_STACK_URL",
        label: "Complete Stack storefront URL",
        secret: false,
        placeholder: "https://shop…/collections/stack",
      },
      {
        key: "COMPLETE_STACK_MALE_URL",
        label: "Male stack URL",
        secret: false,
      },
      {
        key: "COMPLETE_STACK_FEMALE_URL",
        label: "Female stack URL",
        secret: false,
      },
      {
        key: "TELEGRAM_BOT_USERNAME",
        label: "Telegram bot username (no @)",
        secret: false,
      },
      {
        key: "META_WEBHOOK_VERIFY_TOKEN",
        label: "Meta webhook verify token",
        secret: true,
      },
      { key: "META_APP_SECRET", label: "Meta app secret", secret: true },
      {
        key: "META_PAGE_ACCESS_TOKEN",
        label: "Meta page access token",
        secret: true,
      },
      {
        key: "WHATSAPP_ACCESS_TOKEN",
        label: "WhatsApp Cloud API access token",
        secret: true,
      },
      {
        key: "WHATSAPP_PHONE_NUMBER_ID",
        label: "WhatsApp phone number ID",
        secret: false,
        placeholder: "From Meta → WhatsApp → API setup",
      },
      {
        key: "WHATSAPP_BUSINESS_ACCOUNT_ID",
        label: "WhatsApp Business Account ID",
        secret: false,
      },
    ],
  },
  {
    id: "WhatsAppTemplates",
    name: "WhatsApp templates (env fallback)",
    description:
      "Optional env fallbacks. Prefer Growth → WhatsApp → Templates in admin — those win over these names.",
    fields: [
      {
        key: "WHATSAPP_TEMPLATE_WAITLIST_WELCOME",
        label: "Waitlist welcome (fallback name)",
        secret: false,
        placeholder: "waitlist_welcome",
      },
      {
        key: "WHATSAPP_TEMPLATE_CHECKOUT_RECOVERY",
        label: "Checkout recovery (fallback name)",
        secret: false,
        placeholder: "checkout_recovery",
      },
      {
        key: "WHATSAPP_TEMPLATE_PURCHASE_CONFIRMATION",
        label: "Purchase confirmation (fallback name)",
        secret: false,
        placeholder: "purchase_confirmation",
      },
      {
        key: "WHATSAPP_TEMPLATE_PURCHASE_ACTIVATION",
        label: "Purchase activation (fallback name)",
        secret: false,
        placeholder: "purchase_activation",
      },
      {
        key: "WHATSAPP_TEMPLATE_ACTIVATION_REMINDER",
        label: "Activation reminder (fallback name)",
        secret: false,
        placeholder: "activation_reminder",
      },
      {
        key: "WHATSAPP_TEMPLATE_SERVICE_REGISTERED",
        label: "Service registered (fallback name)",
        secret: false,
        placeholder: "service_registered",
      },
      {
        key: "WHATSAPP_SEND_PURCHASE_ACTIVATION",
        label: "Send first-party purchase WA (true/false)",
        secret: false,
        placeholder: "true",
      },
    ],
  },
  {
    id: "S8",
    name: "Calendly",
    description: "Booked calls",
    fields: [{ key: "CALENDLY_TOKEN", label: "Personal access token", secret: true }],
  },  {
    id: "S12",
    name: "Revolut",
    description: "Cash balances (Business API)",
    fields: [{ key: "REVOLUT_API_TOKEN", label: "API token", secret: true }],
  },
  {
    id: "S13",
    name: "Frame.io",
    description: "Content hub webhooks",
    fields: [{ key: "FRAME_IO_TOKEN", label: "API token", secret: true }],
  },
  {
    id: "S14",
    name: "Instagram publish",
    description: "Graph API content posting (after Kane approval)",
    fields: [
      {
        key: "META_INSTAGRAM_ACCOUNT_ID",
        label: "IG business account ID",
        secret: false,
      },
      {
        key: "META_PAGE_ACCESS_TOKEN",
        label: "Page access token (publish)",
        secret: true,
      },
    ],
  },
  {
    id: "S15",
    name: "TikTok publish",
    description: "Content Posting API — private until TikTok audits the app",
    fields: [
      { key: "TIKTOK_ACCESS_TOKEN", label: "Access token", secret: true },
    ],
  },
  {
    id: "S16",
    name: "YouTube publish",
    description: "Data API upload — private until Google audits the project",
    fields: [
      { key: "YOUTUBE_ACCESS_TOKEN", label: "OAuth access token", secret: true },
    ],
  },
  {
    id: "Telegram",
    name: "Telegram",
    description: "Kane approvals + daily reports",
    fields: [
      { key: "TELEGRAM_BOT_TOKEN", label: "Bot token", secret: true },
      { key: "TELEGRAM_KANE_CHAT_ID", label: "Kane chat ID", secret: false },
      { key: "TELEGRAM_LEAH_CHAT_ID", label: "Leah chat ID", secret: false },
    ],
  },
  {
    id: "CTO",
    name: "CTO agent",
    description:
      "Gemini powers Command drafts (preferred). Anthropic remains an optional fallback if Gemini is unset.",
    fields: [
      { key: "GEMINI_API_KEY", label: "Gemini API key", secret: true },
      {
        key: "GEMINI_MODEL",
        label: "Gemini model (optional)",
        secret: false,
        placeholder: "gemini-2.5-flash",
      },
      {
        key: "ANTHROPIC_API_KEY",
        label: "Anthropic API key (fallback)",
        secret: true,
      },
    ],
  },
];

export const ALL_CREDENTIAL_KEYS = CREDENTIAL_GROUPS.flatMap((g) =>
  g.fields.map((f) => f.key),
);
