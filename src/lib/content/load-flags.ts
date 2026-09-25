import "server-only";

import { db } from "@/db";
import {
  computePostCardFlags,
  formatFlagsForTelegram,
  type PostCardFlag,
} from "@/lib/content/post-card-flags";
import { dubaiWeekStartMonday } from "@/lib/content/social-manager";

/** Load §7.5 flags for a post card (WPP + channel context). */
export async function loadPostCardFlags(postCardId: string): Promise<{
  flags: PostCardFlag[];
  telegramBlock: string;
}> {
  const card = await db.postCard.findUniqueOrThrow({
    where: { id: postCardId },
    include: { asset: true },
  });

  const weekStart = dubaiWeekStartMonday(
    card.scheduledAt ?? card.createdAt,
  );
  const [wpp, channel] = await Promise.all([
    db.weeklyPostingPlan.findUnique({ where: { weekStart } }),
    db.channel.findUnique({
      where: {
        platform_account: {
          platform: card.platform,
          account: card.account,
        },
      },
    }),
  ]);

  const flags = computePostCardFlags({
    caption: card.caption,
    compliancePass: card.compliancePass,
    complianceResult: card.complianceResult,
    creatorLicence: card.asset.creatorLicence,
    publicConsent: card.asset.publicConsent,
    platform: card.platform,
    account: card.account,
    scheduledAt: card.scheduledAt,
    assetTags: card.asset.tags,
    wppStatus: wpp?.status ?? null,
    wppNotes: wpp?.notes ?? null,
    channelPaused: channel?.paused ?? false,
    channelWarning: Boolean(
      channel?.paused ||
        /strike|warning|restriction/i.test(card.complianceResult ?? ""),
    ),
  });

  return { flags, telegramBlock: formatFlagsForTelegram(flags) };
}

/** Serialize flags for the content page client. */
export function serializeFlags(flags: PostCardFlag[]) {
  return flags.map((f) => ({
    id: f.id,
    label: f.label,
    detail: f.detail,
    blocksApproval: f.blocksApproval,
    blocksOneTap: f.blocksOneTap,
  }));
}
