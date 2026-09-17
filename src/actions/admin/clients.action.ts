"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import * as z from "zod";

import { db } from "@/db";
import {
  ensurePersonForCustomer,
  resolveClientPersonId,
} from "@/lib/admin/clients";
import { requireAdminSession } from "@/lib/auth/session";
import { actionClient } from "@/lib/safe-action";

const personIdSchema = z.string().min(1);

export const updateClientProfileAction = actionClient
  .metadata({ actionName: "admin.updateClientProfile" })
  .inputSchema(
    z.object({
      personId: personIdSchema,
      name: z.string().trim().min(1).max(120).optional(),
      phone: z.string().trim().max(40).optional().nullable(),
      country: z.string().trim().max(80).optional().nullable(),
      timezone: z.string().trim().max(80).optional().nullable(),
      dateOfBirth: z.string().optional().nullable(),
      bioSummary: z.string().trim().max(4000).optional().nullable(),
      igHandle: z.string().trim().max(80).optional().nullable(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "lemoni", "leah"]);
    const id = await resolveClientPersonId(parsedInput.personId);
    if (!id) throw new Error("Client not found");

    const dob =
      parsedInput.dateOfBirth && parsedInput.dateOfBirth.length > 0
        ? new Date(parsedInput.dateOfBirth)
        : parsedInput.dateOfBirth === null
          ? null
          : undefined;

    await db.personCustomer.update({
      where: { id },
      data: {
        ...(parsedInput.name !== undefined ? { name: parsedInput.name } : {}),
        ...(parsedInput.phone !== undefined ? { phone: parsedInput.phone } : {}),
        ...(parsedInput.country !== undefined
          ? { country: parsedInput.country }
          : {}),
        ...(parsedInput.timezone !== undefined
          ? { timezone: parsedInput.timezone }
          : {}),
        ...(dob !== undefined ? { dateOfBirth: dob } : {}),
        ...(parsedInput.bioSummary !== undefined
          ? { bioSummary: parsedInput.bioSummary }
          : {}),
        ...(parsedInput.igHandle !== undefined
          ? { igHandle: parsedInput.igHandle }
          : {}),
      },
    });

    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "client.profile.update",
        entityType: "PersonCustomer",
        entityId: id,
      },
    });

    return { ok: true as const };
  });

export const uploadClientImageAction = actionClient
  .metadata({ actionName: "admin.uploadClientImage" })
  .inputSchema(
    z.object({
      personId: personIdSchema,
      dataBase64: z.string().min(32),
      contentType: z
        .string()
        .regex(/^image\/(png|jpeg|jpg|webp)$/i, "PNG, JPEG or WebP only"),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "lemoni", "leah"]);
    const id = await resolveClientPersonId(parsedInput.personId);
    if (!id) throw new Error("Client not found");

    const bytes = Buffer.from(parsedInput.dataBase64, "base64");
    if (bytes.byteLength < 64 || bytes.byteLength > 2_000_000) {
      throw new Error("Image must be between 64B and 2MB");
    }

    const ext = parsedInput.contentType.includes("png")
      ? "png"
      : parsedInput.contentType.includes("webp")
        ? "webp"
        : "jpg";
    const dir = path.join(process.cwd(), "public", "uploads", "clients");
    await mkdir(dir, { recursive: true });
    const fileName = `${id}.${ext}`;
    await writeFile(path.join(dir, fileName), bytes);
    const image = `/uploads/clients/${fileName}?v=${Date.now()}`;

    await db.personCustomer.update({
      where: { id },
      data: { image },
    });

    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "client.image.upload",
        entityType: "PersonCustomer",
        entityId: id,
      },
    });

    return { ok: true as const, image };
  });

export const assignClientStaffAction = actionClient
  .metadata({ actionName: "admin.assignClientStaff" })
  .inputSchema(
    z.object({
      personId: personIdSchema,
      staffPersonKey: z.string().trim().min(1).max(40),
      role: z.enum(["coach", "cs", "setter", "am", "fulfilment"]),
      notes: z.string().trim().max(500).optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "lemoni"]);
    const id = await resolveClientPersonId(parsedInput.personId);
    if (!id) throw new Error("Client not found");

    await db.clientStaffAssignment.updateMany({
      where: {
        personId: id,
        staffPersonKey: parsedInput.staffPersonKey,
        role: parsedInput.role,
        endedAt: null,
      },
      data: { endedAt: new Date() },
    });

    await db.clientStaffAssignment.create({
      data: {
        personId: id,
        staffPersonKey: parsedInput.staffPersonKey,
        role: parsedInput.role,
        notes: parsedInput.notes,
        assignedBy: session.user.email,
      },
    });

    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "client.staff.assign",
        entityType: "PersonCustomer",
        entityId: id,
        meta: {
          staffPersonKey: parsedInput.staffPersonKey,
          role: parsedInput.role,
        },
      },
    });

    return { ok: true as const };
  });

export const unassignClientStaffAction = actionClient
  .metadata({ actionName: "admin.unassignClientStaff" })
  .inputSchema(z.object({ assignmentId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "lemoni"]);
    const row = await db.clientStaffAssignment.update({
      where: { id: parsedInput.assignmentId },
      data: { endedAt: new Date() },
    });

    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "client.staff.unassign",
        entityType: "PersonCustomer",
        entityId: row.personId,
        meta: { assignmentId: row.id },
      },
    });

    return { ok: true as const };
  });

export const addClientNoteAction = actionClient
  .metadata({ actionName: "admin.addClientNote" })
  .inputSchema(
    z.object({
      personId: personIdSchema,
      body: z.string().trim().min(1).max(5000),
      pinned: z.boolean().optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "lemoni", "leah"]);
    const id = await resolveClientPersonId(parsedInput.personId);
    if (!id) throw new Error("Client not found");

    await db.clientNote.create({
      data: {
        personId: id,
        authorEmail: session.user.email,
        body: parsedInput.body,
        pinned: parsedInput.pinned ?? false,
      },
    });

    return { ok: true as const };
  });

export const logClientSessionAction = actionClient
  .metadata({ actionName: "admin.logClientSession" })
  .inputSchema(
    z.object({
      personId: personIdSchema,
      title: z.string().trim().min(1).max(160),
      type: z.enum([
        "coaching_call",
        "checkin",
        "assessment",
        "training",
        "onboarding",
        "other",
      ]),
      status: z.enum(["scheduled", "completed", "no_show", "cancelled"]),
      scheduledAt: z.string().min(1),
      durationMin: z.number().int().min(1).max(600).optional(),
      staffPersonKey: z.string().trim().max(40).optional(),
      notes: z.string().trim().max(2000).optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "lemoni"]);
    const id = await resolveClientPersonId(parsedInput.personId);
    if (!id) throw new Error("Client not found");

    const person = await db.personCustomer.findUnique({
      where: { id },
      select: { customerId: true },
    });

    const scheduledAt = new Date(parsedInput.scheduledAt);
    const status = parsedInput.status;

    await db.clientSession.create({
      data: {
        personId: id,
        customerId: person?.customerId,
        title: parsedInput.title,
        type: parsedInput.type,
        status,
        scheduledAt,
        completedAt: status === "completed" ? scheduledAt : null,
        durationMin: parsedInput.durationMin,
        staffPersonKey: parsedInput.staffPersonKey,
        notes: parsedInput.notes,
        createdBy: session.user.email,
      },
    });

    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "client.session.log",
        entityType: "PersonCustomer",
        entityId: id,
      },
    });

    return { ok: true as const };
  });

export const linkCustomerToPersonAction = actionClient
  .metadata({ actionName: "admin.linkCustomerToPerson" })
  .inputSchema(z.object({ customerId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    const person = await ensurePersonForCustomer(parsedInput.customerId);
    await db.auditLog.create({
      data: {
        actor: session.user.email,
        action: "client.link.customer",
        entityType: "PersonCustomer",
        entityId: person.id,
        meta: { customerId: parsedInput.customerId },
      },
    });
    return { ok: true as const, personId: person.id };
  });
