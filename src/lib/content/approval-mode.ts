import "server-only";

import { db } from "@/db";
import { ContentState } from "@/lib/content/states";

export type ApprovalMode = "every_post" | "autopilot";

/**
 * Part 07 §7.7 — default every_post. Autopilot only after Kane enables it
 * (never switched on automatically). Eligibility is advisory for the settings UI.
 */
export function isAutopilotEligible(stats: {
  daysOnEveryPost: number;
  firstPassComplianceRate: number;
  rejectedCount: number;
}) {
  return (
    stats.daysOnEveryPost >= 14 &&
    stats.firstPassComplianceRate >= 0.95 &&
    stats.rejectedCount === 0
  );
}

export async function getChannelApprovalMode(
  platform: string,
  account: string,
): Promise<ApprovalMode> {
  const ch = await db.channel.findUnique({
    where: { platform_account: { platform, account } },
  });
  return ch?.approvalMode === "autopilot" ? "autopilot" : "every_post";
}

/**
 * Whether a card inside an agreed WPP with clean flags may skip per-post
 * approval when Channel.approvalMode === autopilot.
 */
export async function mayAutopilotSchedule(input: {
  platform: string;
  account: string;
  compliancePass: boolean;
  flagsBlockOneTap: boolean;
  wppAgreed: boolean;
}) {
  if (!input.compliancePass || input.flagsBlockOneTap || !input.wppAgreed) {
    return false;
  }
  const mode = await getChannelApprovalMode(input.platform, input.account);
  return mode === "autopilot";
}

/** Kane-only — settings stub stores every_post | autopilot on Channel. */
export async function setChannelApprovalMode(input: {
  platform: string;
  account: string;
  mode: ApprovalMode;
  actor: string;
}) {
  await db.channel.upsert({
    where: {
      platform_account: {
        platform: input.platform,
        account: input.account,
      },
    },
    create: {
      platform: input.platform,
      account: input.account,
      approvalMode: input.mode,
      paused: false,
    },
    update: { approvalMode: input.mode },
  });
  await db.auditLog.create({
    data: {
      actor: input.actor,
      action: "content.set_approval_mode",
      meta: {
        platform: input.platform,
        account: input.account,
        mode: input.mode,
      },
    },
  });
  return { mode: input.mode };
}

/** Rough eligibility snapshot for the settings enableForm stub. */
export async function approvalModeEligibility(
  platform: string,
  account: string,
) {
  const channel = await db.channel.findUnique({
    where: { platform_account: { platform, account } },
  });
  const since = channel?.createdAt ?? new Date(0);
  const daysOnEveryPost = Math.floor(
    (Date.now() - since.getTime()) / (24 * 60 * 60_000),
  );

  const [total, failedCompliance, rejected] = await Promise.all([
    db.postCard.count({
      where: { platform, account, status: { in: [ContentState.published, "published", "posted", ContentState.scheduled] } },
    }),
    db.postCard.count({
      where: {
        platform,
        account,
        compliancePass: false,
        updatedAt: { gte: since },
      },
    }),
    db.postCard.count({
      where: {
        platform,
        account,
        status: { in: [ContentState.failed, "failed", "rejected"] },
        updatedAt: { gte: since },
      },
    }),
  ]);

  const firstPass =
    total + failedCompliance === 0
      ? 1
      : total / Math.max(1, total + failedCompliance);

  const stats = {
    daysOnEveryPost,
    firstPassComplianceRate: firstPass,
    rejectedCount: rejected,
  };

  return {
    approvalMode: (channel?.approvalMode === "autopilot"
      ? "autopilot"
      : "every_post") as ApprovalMode,
    eligible: isAutopilotEligible(stats),
    stats,
  };
}
