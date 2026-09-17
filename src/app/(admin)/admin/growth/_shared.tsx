import { AdminShell } from "@/components/admin/AdminShell";
import { GrowthInbox } from "@/components/admin/GrowthInbox";
import {
  getGrowthChannelThreads,
  type GrowthChannel,
} from "@/lib/admin/growth-channels";
import { requireAdminSession } from "@/lib/auth/session";
import type { StaffRole } from "@/generated/prisma/client";

const CHANNEL_META: Record<
  GrowthChannel,
  {
    titleKey: string;
    label: string;
    lead: string;
    roles: StaffRole[];
    canRespond: StaffRole[];
  }
> = {
  whatsapp: {
    titleKey: "whatsapp",
    label: "WhatsApp",
    lead: "WhatsApp automation inbox — AI first, humans on escalations.",
    roles: ["kane", "leah", "lemoni"],
    canRespond: ["kane", "leah"],
  },
  instagram: {
    titleKey: "instagram",
    label: "Instagram",
    lead: "Instagram DMs — sales and brand risk escalate to humans.",
    roles: ["kane", "lemoni", "leah"],
    canRespond: ["kane", "lemoni"],
  },
  telegram: {
    titleKey: "telegram",
    label: "Telegram",
    lead: "Telegram ops + approvals channel for Kane and the CTO agent.",
    roles: ["kane", "leah", "indigo"],
    canRespond: ["kane", "leah"],
  },
  email: {
    titleKey: "email-inbox",
    label: "Email inbox",
    lead: "Support and lead email threads mirrored from Gmail / GHL.",
    roles: ["kane", "leah", "lemoni"],
    canRespond: ["kane", "leah"],
  },
};

export async function GrowthChannelPage({
  channel,
}: {
  channel: GrowthChannel;
}) {
  const meta = CHANNEL_META[channel];
  const session = await requireAdminSession(meta.roles);
  const data = await getGrowthChannelThreads(channel);

  return (
    <AdminShell titleKey={meta.titleKey}>
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">{meta.lead}</div>
      </div>
      <GrowthInbox
        channelLabel={meta.label}
        aiHandledHint={data.aiHandledHint}
        threads={data.threads}
        canRespond={meta.canRespond.includes(session.user.role)}
      />
    </AdminShell>
  );
}
