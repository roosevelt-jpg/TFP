import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { hashPassword } from "better-auth/crypto";

import { db } from "@/db";
import { env } from "@/env";
import type { PersonKey } from "@/lib/admin/staff";
import { personKeyForRole, STAFF_PEOPLE } from "@/lib/admin/staff";
import {
  sendStaffInviteEmail,
  sendStaffWelcomeEmail,
} from "@/lib/admin/staff-emails";
import type { StaffRole } from "@/generated/prisma/client";

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newInviteToken() {
  return randomBytes(32).toString("base64url");
}

export async function createStaffInvite(input: {
  email: string;
  role: StaffRole;
  invitedBy: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (input.role === "kane") {
    throw new Error("Cannot invite another Kane via this flow");
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === "kane") {
      throw new Error("That email is already Kane");
    }
    // Re-add / restore a removed (viewer) or role-change an existing account.
    await db.user.update({
      where: { id: existing.id },
      data: { role: input.role },
    });
    const personKey = personKeyForRole(input.role);
    if (personKey) {
      await seedDefaultTodos(personKey, existing.id);
    }
    return {
      id: existing.id,
      email,
      role: input.role,
      expiresAt: new Date(),
      acceptUrl: `${env.NEXT_PUBLIC_APP_URL}/admin/login`,
      emailSent: false,
      restored: true as const,
    };
  }

  const token = newInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 86_400_000);

  await db.staffInvite.updateMany({
    where: { email, acceptedAt: null },
    data: { expiresAt: new Date() },
  });

  const invite = await db.staffInvite.create({
    data: {
      email,
      role: input.role,
      tokenHash: hashInviteToken(token),
      invitedBy: input.invitedBy,
      expiresAt,
    },
  });

  const acceptUrl = `${env.NEXT_PUBLIC_APP_URL}/admin/accept-invite?token=${token}`;

  let emailSent = false;
  try {
    await sendStaffInviteEmail({
      to: email,
      role: input.role,
      acceptUrl,
      invitedBy: input.invitedBy,
    });
    emailSent = true;
  } catch {
    emailSent = false;
  }

  return {
    id: invite.id,
    email,
    role: input.role,
    expiresAt,
    acceptUrl,
    emailSent,
  };
}

export async function acceptStaffInvite(input: {
  token: string;
  fullName: string;
  phone: string;
  whatsapp?: string;
  jobTitle: string;
  timezone: string;
  password: string;
}) {
  const tokenHash = hashInviteToken(input.token);
  const invite = await db.staffInvite.findUnique({ where: { tokenHash } });
  if (!invite || invite.acceptedAt) {
    throw new Error("Invite not found or already used");
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    throw new Error("Invite has expired");
  }

  const email = invite.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Account already exists — sign in instead");
  }

  const fullName = input.fullName.trim();
  const phone = input.phone.trim();
  const whatsapp = input.whatsapp?.trim() || phone;
  const jobTitle = input.jobTitle.trim();
  const timezone = input.timezone.trim() || "Asia/Dubai";

  const user = await db.user.create({
    data: {
      email,
      name: fullName,
      emailVerified: true,
      role: invite.role,
      twoFactorEnabled: false,
    },
  });

  const hashed = await hashPassword(input.password);
  await db.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: hashed,
    },
  });

  await db.staffProfile.create({
    data: {
      userId: user.id,
      fullName,
      phone,
      whatsapp,
      jobTitle,
      timezone,
      completedAt: new Date(),
    },
  });

  await db.staffInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  const personKey = personKeyForRole(invite.role);
  if (personKey) {
    await seedDefaultTodos(personKey, user.id);
  }

  const deskUrl = `${env.NEXT_PUBLIC_APP_URL}/admin/me`;
  let welcomeSent = false;
  try {
    await sendStaffWelcomeEmail({
      to: email,
      fullName,
      role: invite.role,
      deskUrl,
    });
    welcomeSent = true;
  } catch {
    welcomeSent = false;
  }

  return {
    userId: user.id,
    role: invite.role,
    email,
    welcomeSent,
    deskUrl,
  };
}

export async function seedDefaultTodos(personKey: PersonKey, userId: string) {
  const defaults: Record<PersonKey, string[]> = {
    leah: [
      "Upload today’s finance template before 13:00 Dubai",
      "Clear CS backlog and flag anything needing Kane",
    ],
    lemoni: [
      "Confirm tomorrow’s calls and chase no-replies",
      "Submit weekly report (due Saturday 20:00 Dubai)",
    ],
    indigo: [
      "Check n8n / Escalation Router health",
      "Submit weekly systems position report",
    ],
    asim: [
      "Dispatch all UK orders within 24h of payment",
      "Submit weekly fulfilment position report",
    ],
  };

  const open = await db.staffTodo.count({
    where: { personKey, status: "open" },
  });
  if (open > 0) return;

  const dueAt = new Date(Date.now() + 86_400_000);
  for (const title of defaults[personKey]) {
    await db.staffTodo.create({
      data: {
        personKey,
        userId,
        title,
        dueAt,
        source: "system",
        createdBy: "system",
      },
    });
  }
}

export async function listStaffUsers() {
  return db.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      updatedAt: true,
      twoFactorEnabled: true,
    },
  });
}

export async function listOpenInvites() {
  return db.staffInvite.findMany({
    where: { acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeStaffInvite(inviteId: string) {
  await db.staffInvite.update({
    where: { id: inviteId },
    data: { expiresAt: new Date() },
  });
}

/** Soft-remove: strip Command access (viewer). Kane cannot remove himself. */
export async function removeStaffAccess(userId: string) {
  const target = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (target.role === "kane") {
    throw new Error("Cannot remove Kane access from this panel");
  }
  return db.user.update({
    where: { id: userId },
    data: { role: "viewer" },
  });
}

export async function updateUserRole(userId: string, role: StaffRole) {
  const target = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (target.role === "kane" && role !== "kane") {
    const kaneCount = await db.user.count({ where: { role: "kane" } });
    if (kaneCount <= 1) {
      throw new Error("Cannot demote the only Kane account");
    }
  }
  if (role === "kane" && target.role !== "kane") {
    throw new Error("Promote to Kane only via bootstrap / DB — not this panel");
  }
  return db.user.update({
    where: { id: userId },
    data: { role },
  });
}

export function personLabel(personKey: string) {
  return STAFF_PEOPLE.find((p) => p.personKey === personKey)?.name ?? personKey;
}
