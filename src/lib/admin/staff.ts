import type { StaffRole } from "@/generated/prisma/client";
import type { AdminNavGroup, AdminNavItem } from "@/lib/admin/nav";
import { ADMIN_NAV } from "@/lib/admin/nav";

export type PersonKey = "leah" | "lemoni" | "indigo" | "asim";

export type StaffPerson = {
  personKey: PersonKey;
  role: StaffRole;
  name: string;
  title: string;
};

/** Scorecard people — matches Roosevelt P1–P4. */
export const STAFF_PEOPLE: StaffPerson[] = [
  {
    personKey: "leah",
    role: "leah",
    name: "Leah",
    title: "Finance & customer service",
  },
  {
    personKey: "lemoni",
    role: "lemoni",
    name: "Lemoni",
    title: "Head of Affiliates + PA",
  },
  {
    personKey: "indigo",
    role: "indigo",
    name: "Indigo",
    title: "GHL / n8n automation",
  },
  {
    personKey: "asim",
    role: "asim",
    name: "Asim",
    title: "UK pick & pack",
  },
];

export const INVITEABLE_ROLES: StaffRole[] = [
  "leah",
  "lemoni",
  "indigo",
  "asim",
  "viewer",
];

/** Path prefixes each role may open. Kane is unrestricted. */
const ROLE_PATHS: Record<StaffRole, string[]> = {
  kane: ["*"],
  leah: [
    "/admin/me",
    "/admin/clients",
    "/admin/money",
    "/admin/email",
    "/admin/growth/funnel",
    "/admin/growth/whatsapp",
    "/admin/growth/instagram",
    "/admin/growth/telegram",
    "/admin/growth/email",
    "/admin/alerts",
  ],
  lemoni: [
    "/admin/me",
    "/admin/clients",
    "/admin/coaching",
    "/admin/training",
    "/admin/content",
    "/admin/cms",
    "/admin/email",
    "/admin/growth/funnel",
    "/admin/growth/instagram",
    "/admin/growth/whatsapp",
    "/admin/growth/email",
    "/admin/alerts",
  ],
  indigo: [
    "/admin/me",
    "/admin/integrations",
    "/admin/meta",
    "/admin/growth/telegram",
    "/admin/alerts",
  ],
  asim: ["/admin/me", "/admin/fulfilment", "/admin/alerts"],
  viewer: ["/admin/me"],
};

const ME_ITEM: AdminNavItem = {
  id: "me",
  label: "My Desk",
  href: "/admin/me",
  icon: "command",
};

export function personKeyForRole(role: StaffRole): PersonKey | null {
  const match = STAFF_PEOPLE.find((p) => p.role === role);
  return match?.personKey ?? null;
}

export function staffPerson(personKey: string): StaffPerson | undefined {
  return STAFF_PEOPLE.find((p) => p.personKey === personKey);
}

export function homePathForRole(role: StaffRole): string {
  return role === "kane" ? "/admin" : "/admin/me";
}

export function canAccessPath(role: StaffRole, pathname: string): boolean {
  if (role === "kane") return true;
  const allowed = ROLE_PATHS[role] ?? ["/admin/me"];
  const path = pathname.split("?")[0] ?? pathname;
  if (path === "/admin" || path === "/admin/") return false;
  return allowed.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function filterNavForRole(role: StaffRole): AdminNavGroup[] {
  if (role === "kane") {
    return [
      {
        group: "Overview",
        items: [ME_ITEM, ...ADMIN_NAV[0]!.items],
      },
      ...ADMIN_NAV.slice(1),
    ];
  }

  const allowed = ROLE_PATHS[role] ?? ["/admin/me"];
  const groups: AdminNavGroup[] = [
    { group: "Overview", items: [ME_ITEM] },
  ];

  for (const group of ADMIN_NAV) {
    const items = group.items.filter((item) => {
      if (item.href === "/admin") return false;
      return allowed.some(
        (prefix) =>
          item.href === prefix || item.href.startsWith(`${prefix}/`),
      );
    });
    if (items.length > 0) {
      groups.push({ ...group, items });
    }
  }

  return groups;
}
