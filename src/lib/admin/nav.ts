export type AdminNavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  count?: number;
  urgent?: boolean;
};

export type AdminNavGroup = {
  group: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    group: "Overview",
    items: [
      { id: "command", label: "Command", href: "/admin", icon: "command" },
      { id: "clients", label: "Clients", href: "/admin/clients", icon: "clients" },
    ],
  },
  {
    group: "Business lines",
    items: [
      { id: "money", label: "Money", href: "/admin/money", icon: "money" },
      {
        id: "supplements",
        label: "Supplements",
        href: "/admin/supplements",
        icon: "supplements",
      },
      {
        id: "coaching",
        label: "Coaching",
        href: "/admin/coaching",
        icon: "coaching",
      },
      {
        id: "training",
        label: "Training",
        href: "/admin/training",
        icon: "training",
      },
    ],
  },
  {
    group: "Growth",
    items: [
      { id: "meta", label: "Meta", href: "/admin/meta", icon: "meta" },
      {
        id: "funnel",
        label: "Funnel",
        href: "/admin/growth/funnel",
        icon: "meta",
      },
      {
        id: "whatsapp",
        label: "WhatsApp",
        href: "/admin/growth/whatsapp",
        icon: "whatsapp",
      },
      {
        id: "instagram",
        label: "Instagram",
        href: "/admin/growth/instagram",
        icon: "instagram",
      },
      {
        id: "telegram",
        label: "Telegram",
        href: "/admin/growth/telegram",
        icon: "telegram",
      },
      {
        id: "email",
        label: "Email",
        href: "/admin/email",
        icon: "email",
      },
      {
        id: "content",
        label: "Content",
        href: "/admin/content",
        icon: "content",
      },
    ],
  },
  {
    group: "Operations",
    items: [
      {
        id: "fulfilment",
        label: "Fulfilment",
        href: "/admin/fulfilment",
        icon: "fulfilment",
      },
      { id: "team", label: "Team", href: "/admin/team", icon: "team" },
      {
        id: "alerts",
        label: "Alerts + approvals",
        href: "/admin/alerts",
        icon: "alerts",
        urgent: true,
      },
    ],
  },
  {
    group: "System",
    items: [
      {
        id: "integrations",
        label: "Integrations + API",
        href: "/admin/integrations",
        icon: "integrations",
      },
      {
        id: "settings",
        label: "Settings + access",
        href: "/admin/settings",
        icon: "settings",
      },
      {
        id: "cms",
        label: "Landing CMS",
        href: "/admin/cms",
        icon: "content",
      },
    ],
  },
];

export const ADMIN_TITLES: Record<string, string> = {
  command: "Command",
  me: "My Desk",
  clients: "Clients",
  funnel: "Funnel metrics",
  money: "Money",
  supplements: "Supplements",
  coaching: "Coaching programme",
  training: "Training programme",
  meta: "Meta",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  telegram: "Telegram",
  "email-inbox": "Email inbox",
  email: "Email",
  fulfilment: "Fulfilment",
  team: "Team",
  alerts: "Alerts + approvals log",
  content: "Content studio",
  integrations: "Integrations + API",
  settings: "Settings + access",
  cms: "Landing CMS",
  login: "Sign in",
  "setup-2fa": "Set up 2FA",
  "accept-invite": "Accept invite",
};
