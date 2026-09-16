"use client";

import { useTransition } from "react";

import { decideApprovalAction } from "@/actions/admin/approvals.action";
import { createContentApprovalAction } from "@/actions/admin/content.action";

type Card = {
  id: string;
  title: string;
  platform: string;
  account: string;
  scheduledAt: string | null;
  compliancePass: boolean;
  complianceResult: string | null;
};

export function ContentApprovals({ cards }: { cards: Card[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-head">
        <div className="cmd-panel-title">Awaiting your approval</div>
      </div>
      <div className="cmd-panel-body">
        {cards.map((card) => (
          <div className="cmd-approval-card" key={card.id}>
            <div className="cmd-approval-top">
              <div>
                <div className="cmd-alert-id">
                  POST · {card.platform.toUpperCase()}
                </div>
                <div className="cmd-approval-what">{card.title}</div>
              </div>
              <span
                className={`cmd-badge ${card.compliancePass ? "cmd-badge-verified" : "cmd-badge-issue"}`}
              >
                {card.compliancePass ? "Passed compliance" : "Compliance fail"}
              </span>
            </div>
            <div className="cmd-approval-grid">
              <div>
                <span>Account</span>
                {card.account}
              </div>
              <div>
                <span>Slot</span>
                {card.scheduledAt
                  ? new Date(card.scheduledAt).toLocaleString("en-GB", {
                      timeZone: "Asia/Dubai",
                    })
                  : "Unset"}
              </div>
              <div>
                <span>Compliance</span>
                {card.complianceResult ?? "—"}
              </div>
            </div>
            <div className="cmd-approval-foot">
              <button
                type="button"
                className="cmd-btn cmd-btn-sm cmd-btn-primary"
                disabled={pending || !card.compliancePass}
                onClick={() =>
                  startTransition(async () => {
                    const created = await createContentApprovalAction({
                      postCardId: card.id,
                    });
                    if (created?.data?.approvalId) {
                      await decideApprovalAction({
                        id: created.data.approvalId,
                        decision: "approved",
                      });
                    }
                  })
                }
              >
                Approve &amp; schedule
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
