import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { db } from "@/db";
import type { ApprovalStatus, Prisma } from "@/generated/prisma/client";

export function newApprovalToken(): string {
  return randomBytes(24).toString("hex");
}

export function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function createApprovalRequest(input: {
  action: string;
  objectIds: Prisma.InputJsonValue;
  beforeState?: Prisma.InputJsonValue;
  afterState?: Prisma.InputJsonValue;
  reach?: string;
  reversible?: boolean;
  specialistVerdict?: string;
  createdBy?: string;
  expiresInHours?: number;
}) {
  const payload = {
    action: input.action,
    objectIds: input.objectIds,
    beforeState: input.beforeState ?? null,
    afterState: input.afterState ?? null,
  };
  const token = newApprovalToken();
  const expiresAt = new Date(
    Date.now() + (input.expiresInHours ?? 24) * 60 * 60 * 1000,
  );

  return db.approvalRequest.create({
    data: {
      token,
      action: input.action,
      objectIds: input.objectIds,
      beforeState: input.beforeState,
      afterState: input.afterState,
      reach: input.reach,
      reversible: input.reversible ?? true,
      specialistVerdict: input.specialistVerdict,
      expiresAt,
      payloadHash: hashPayload(payload),
      createdBy: input.createdBy,
    },
  });
}

export async function decideApproval(input: {
  id: string;
  decision: Extract<ApprovalStatus, "approved" | "rejected">;
  actor: string;
}) {
  const row = await db.approvalRequest.findUniqueOrThrow({
    where: { id: input.id },
  });

  if (row.status !== "pending") {
    throw new Error(`Approval is already ${row.status}`);
  }
  if (row.expiresAt.getTime() < Date.now()) {
    await db.approvalRequest.update({
      where: { id: row.id },
      data: { status: "expired" },
    });
    throw new Error("Approval token expired");
  }

  const now = new Date();
  const updated = await db.approvalRequest.update({
    where: { id: row.id },
    data: {
      status: input.decision,
      approvedAt: input.decision === "approved" ? now : null,
      rejectedAt: input.decision === "rejected" ? now : null,
    },
  });

  await db.auditLog.create({
    data: {
      actor: input.actor,
      action: `approval.${input.decision}`,
      entityType: "ApprovalRequest",
      entityId: row.id,
      before: { status: row.status },
      after: { status: updated.status },
      meta: { token: row.token, approvalAction: row.action },
    },
  });

  return updated;
}

export async function executeApprovedAction(input: {
  id: string;
  actor: string;
  /** If omitted, the dispatcher runs the real side-effect and returns verification. */
  verificationResult?: string;
}) {
  const row = await db.approvalRequest.findUniqueOrThrow({
    where: { id: input.id },
  });
  if (row.status !== "approved") {
    throw new Error("Only approved requests can execute");
  }
  if (row.expiresAt.getTime() < Date.now()) {
    await db.approvalRequest.update({
      where: { id: row.id },
      data: { status: "expired" },
    });
    throw new Error("Approval token expired");
  }
  if (row.executedAt) {
    throw new Error("Approval token already used");
  }

  // Void if the stored payload no longer matches the hash (object changed after draft).
  const currentHash = hashPayload({
    action: row.action,
    objectIds: row.objectIds,
    beforeState: row.beforeState ?? null,
    afterState: row.afterState ?? null,
  });
  if (row.payloadHash && row.payloadHash !== currentHash) {
    await db.approvalRequest.update({
      where: { id: row.id },
      data: { status: "expired" },
    });
    throw new Error("Approval voided — payload changed since draft");
  }

  let verification = input.verificationResult;
  if (!verification) {
    const { dispatchApprovedAction } = await import(
      "@/lib/admin/executors/dispatch"
    );
    const dispatched = await dispatchApprovedAction(row.id);
    verification = dispatched.verification;
    if (!dispatched.ok) {
      await db.auditLog.create({
        data: {
          actor: input.actor,
          action: "approval.execute_failed",
          entityType: "ApprovalRequest",
          entityId: row.id,
          after: { verification },
        },
      });
      throw new Error(verification);
    }
  }

  const executed = await db.approvalRequest.update({
    where: { id: row.id },
    data: {
      status: "executed",
      executedAt: new Date(),
      verificationResult: verification,
    },
  });

  await db.auditLog.create({
    data: {
      actor: input.actor,
      action: "approval.executed",
      entityType: "ApprovalRequest",
      entityId: row.id,
      after: { verificationResult: verification },
    },
  });

  return executed;
}
