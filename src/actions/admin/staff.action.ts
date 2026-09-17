"use server";

import * as z from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import {
  acceptStaffInvite,
  createStaffInvite,
  removeStaffAccess,
  revokeStaffInvite,
  updateUserRole,
} from "@/lib/admin/invites";
import { INVITEABLE_ROLES } from "@/lib/admin/staff";
import { actionClient } from "@/lib/safe-action";
import { db } from "@/db";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";

const roleSchema = z.enum([
  "leah",
  "lemoni",
  "indigo",
  "asim",
  "viewer",
  "kane",
]);

export const inviteStaffAction = actionClient
  .metadata({ actionName: "admin.inviteStaff" })
  .inputSchema(
    z.object({
      email: z.email(),
      role: z.enum(["leah", "lemoni", "indigo", "asim", "viewer"]),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    if (!INVITEABLE_ROLES.includes(parsedInput.role)) {
      throw new Error("Invalid role");
    }
    const invite = await createStaffInvite({
      email: parsedInput.email,
      role: parsedInput.role,
      invitedBy: session.user.email,
    });
    return { ok: true as const, invite };
  });

export const updateStaffRoleAction = actionClient
  .metadata({ actionName: "admin.updateStaffRole" })
  .inputSchema(
    z.object({
      userId: z.string().min(1),
      role: roleSchema,
    }),
  )
  .action(async ({ parsedInput }) => {
    await requireAdminSession(["kane"]);
    const user = await updateUserRole(parsedInput.userId, parsedInput.role);
    return { ok: true as const, userId: user.id, role: user.role };
  });

export const removeStaffAccessAction = actionClient
  .metadata({ actionName: "admin.removeStaffAccess" })
  .inputSchema(z.object({ userId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    await requireAdminSession(["kane"]);
    const user = await removeStaffAccess(parsedInput.userId);
    return { ok: true as const, userId: user.id };
  });

export const revokeStaffInviteAction = actionClient
  .metadata({ actionName: "admin.revokeStaffInvite" })
  .inputSchema(z.object({ inviteId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    await requireAdminSession(["kane"]);
    await revokeStaffInvite(parsedInput.inviteId);
    return { ok: true as const };
  });

export const acceptInviteAction = actionClient
  .metadata({ actionName: "admin.acceptInvite" })
  .inputSchema(
    z.object({
      token: z.string().min(20),
      fullName: z.string().min(2).max(120),
      phone: z.string().min(7).max(40),
      whatsapp: z.string().min(7).max(40).optional().or(z.literal("")),
      jobTitle: z.string().min(2).max(120),
      timezone: z.string().min(3).max(80).default("Asia/Dubai"),
      password: z.string().min(12).max(200),
    }),
  )
  .action(async ({ parsedInput }) => {
    const result = await acceptStaffInvite({
      ...parsedInput,
      whatsapp: parsedInput.whatsapp || undefined,
    });
    return { ok: true as const, ...result };
  });

export const completeStaffProfileAction = actionClient
  .metadata({ actionName: "admin.completeStaffProfile" })
  .inputSchema(
    z.object({
      fullName: z.string().min(2).max(120),
      phone: z.string().min(7).max(40),
      whatsapp: z.string().min(7).max(40).optional().or(z.literal("")),
      jobTitle: z.string().min(2).max(120),
      timezone: z.string().min(3).max(80).default("Asia/Dubai"),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession();
    const fullName = parsedInput.fullName.trim();
    const phone = parsedInput.phone.trim();
    const whatsapp = parsedInput.whatsapp?.trim() || phone;
    await db.staffProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        fullName,
        phone,
        whatsapp,
        jobTitle: parsedInput.jobTitle.trim(),
        timezone: parsedInput.timezone.trim() || "Asia/Dubai",
        completedAt: new Date(),
      },
      update: {
        fullName,
        phone,
        whatsapp,
        jobTitle: parsedInput.jobTitle.trim(),
        timezone: parsedInput.timezone.trim() || "Asia/Dubai",
        completedAt: new Date(),
      },
    });
    await db.user.update({
      where: { id: session.user.id },
      data: { name: fullName },
    });
    return { ok: true as const };
  });

export const completeTodoAction = actionClient
  .metadata({ actionName: "admin.completeTodo" })
  .inputSchema(z.object({ todoId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession();
    const todo = await db.staffTodo.findUniqueOrThrow({
      where: { id: parsedInput.todoId },
    });
    if (
      session.user.role !== "kane" &&
      todo.userId &&
      todo.userId !== session.user.id
    ) {
      throw new Error("Not your todo");
    }
    await db.staffTodo.update({
      where: { id: todo.id },
      data: { status: "done", completedAt: new Date() },
    });
    return { ok: true as const };
  });

export const submitStaffReportAction = actionClient
  .metadata({ actionName: "admin.submitStaffReport" })
  .inputSchema(
    z.object({
      periodLabel: z.string().min(2).max(120),
      body: z.string().min(20).max(20_000),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession([
      "kane",
      "leah",
      "lemoni",
      "indigo",
      "asim",
    ]);
    const { personKeyForRole } = await import("@/lib/admin/staff");
    const personKey = personKeyForRole(session.user.role);
    if (!personKey) throw new Error("Your role has no scorecard");

    const report = await db.staffReport.create({
      data: {
        authorUserId: session.user.id,
        personKey,
        periodLabel: parsedInput.periodLabel.trim(),
        body: parsedInput.body.trim(),
        status: "submitted",
        submittedAt: new Date(),
      },
    });

    const kaneChatId = await getKaneTelegramChatId();
    if (kaneChatId) {
      await sendTelegramMessage({
        chatId: kaneChatId,
        text: `<b>Report submitted</b>\n${session.user.name} (${personKey})\n${report.periodLabel}\nReview at /admin/team`,
      });
    }

    return { ok: true as const, reportId: report.id };
  });

export const reviewStaffReportAction = actionClient
  .metadata({ actionName: "admin.reviewStaffReport" })
  .inputSchema(
    z.object({
      reportId: z.string().min(1),
      decision: z.enum(["approved", "rejected"]),
      note: z.string().max(2_000).optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    await db.staffReport.update({
      where: { id: parsedInput.reportId },
      data: {
        status: parsedInput.decision,
        reviewedBy: session.user.email,
        reviewNote: parsedInput.note?.trim() || null,
        reviewedAt: new Date(),
      },
    });
    return { ok: true as const };
  });

export const assignTodoAction = actionClient
  .metadata({ actionName: "admin.assignTodo" })
  .inputSchema(
    z.object({
      personKey: z.enum(["leah", "lemoni", "indigo", "asim"]),
      title: z.string().min(3).max(300),
      dueAt: z.string().datetime().optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    const user = await db.user.findFirst({
      where: { role: parsedInput.personKey },
    });
    await db.staffTodo.create({
      data: {
        personKey: parsedInput.personKey,
        userId: user?.id,
        title: parsedInput.title.trim(),
        dueAt: parsedInput.dueAt ? new Date(parsedInput.dueAt) : null,
        source: "kane",
        createdBy: session.user.email,
      },
    });
    return { ok: true as const };
  });
