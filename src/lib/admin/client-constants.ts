import type {
  ClientSessionStatus,
  ClientSessionType,
  ClientStaffRole,
} from "@/generated/prisma/client";

export const CLIENT_STAFF_ROLES: ClientStaffRole[] = [
  "coach",
  "cs",
  "setter",
  "am",
  "fulfilment",
];

export const CLIENT_SESSION_TYPES: ClientSessionType[] = [
  "coaching_call",
  "checkin",
  "assessment",
  "training",
  "onboarding",
  "other",
];

export const CLIENT_SESSION_STATUSES: ClientSessionStatus[] = [
  "scheduled",
  "completed",
  "no_show",
  "cancelled",
];

export const STAFF_ASSIGN_OPTIONS = [
  { personKey: "kane", name: "Kane" },
  { personKey: "leah", name: "Leah" },
  { personKey: "lemoni", name: "Lemoni" },
  { personKey: "indigo", name: "Indigo" },
  { personKey: "asim", name: "Asim" },
] as const;
