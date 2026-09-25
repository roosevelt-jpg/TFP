"use client";

import { useState, useTransition } from "react";

import { setApprovalModeAction } from "@/actions/admin/approval-mode.action";

type ChannelRow = {
  id: string;
  platform: string;
  account: string;
  approvalMode: string;
  eligible: boolean;
  daysOnEveryPost: number;
  firstPassComplianceRate: number;
  rejectedCount: number;
};

/**
 * Kane-only stub: per-account approval_mode (default every_post).
 * Autopilot can only be switched on here after eligibility — never automatically.
 */
export function AutopilotSettingsForm({ channels }: { channels: ChannelRow[] }) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  if (channels.length === 0) {
    return (
      <div className="cmd-panel-body">
        <div className="cmd-list-sub">
          No Channel rows yet. Channels are created when an account is paused or
          tokens are registered. Default for every account is{" "}
          <code>every_post</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="cmd-panel-body">
      {note ? <div className="cmd-section-note">{note}</div> : null}
      <div className="cmd-list-sub" style={{ marginBottom: 12 }}>
        Default is every post. Autopilot (in-plan, clean flags, no per-post
        approval) is Kane-only and stays off until you enable it here after ≥2
        weeks on every_post, ≥95% first-pass compliance, and zero rejects.
      </div>
      {channels.map((ch) => (
        <div className="cmd-list-row" key={ch.id}>
          <div>
            <div className="cmd-list-title">
              {ch.platform} · {ch.account}
            </div>
            <div className="cmd-list-sub">
              Mode: {ch.approvalMode} · days {ch.daysOnEveryPost} · first-pass{" "}
              {Math.round(ch.firstPassComplianceRate * 100)}% · rejects{" "}
              {ch.rejectedCount}
              {ch.eligible ? " · eligible" : " · not yet eligible"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="cmd-btn cmd-btn-sm"
              disabled={pending || ch.approvalMode === "every_post"}
              onClick={() =>
                startTransition(async () => {
                  await setApprovalModeAction({
                    platform: ch.platform,
                    account: ch.account,
                    mode: "every_post",
                  });
                  setNote(`${ch.account} → every_post`);
                })
              }
            >
              every_post
            </button>
            <button
              type="button"
              className="cmd-btn cmd-btn-sm cmd-btn-primary"
              disabled={pending || !ch.eligible || ch.approvalMode === "autopilot"}
              title={
                ch.eligible
                  ? "Enable autopilot for this account"
                  : "Not eligible yet"
              }
              onClick={() =>
                startTransition(async () => {
                  const res = await setApprovalModeAction({
                    platform: ch.platform,
                    account: ch.account,
                    mode: "autopilot",
                  });
                  setNote(
                    res?.data
                      ? `${ch.account} → autopilot`
                      : (res?.serverError ?? "Failed"),
                  );
                })
              }
            >
              Enable autopilot
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
