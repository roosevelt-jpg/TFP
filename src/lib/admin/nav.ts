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
        id: "email",
        label: "Email + DMs",
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
  money: "Money",
  supplements: "Supplements",
  coaching: "Coaching programme",
  training: "Training programme",
  meta: "Meta",
  email: "Email + DMs",
  fulfilment: "Fulfilment",
  team: "Team",
  alerts: "Alerts + approvals log",
  content: "Content studio",
  integrations: "Integrations + API",
  settings: "Settings + access",
  cms: "Landing CMS",
  login: "Sign in",
  "setup-2fa": "Set up 2FA",
};
