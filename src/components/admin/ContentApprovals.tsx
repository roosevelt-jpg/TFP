"use client";

import { useMemo, useState, useTransition } from "react";

import { decideApprovalAction } from "@/actions/admin/approvals.action";
import {
  batchApproveContentAction,
  createContentApprovalAction,
  editPostCardCaptionAction,
  rejectPostCardAction,
  sendBackPostCardAction,
} from "@/actions/admin/content.action";

type Flag = {
  id: string;
  label: string;
  detail: string;
  blocksApproval: boolean;
  blocksOneTap: boolean;
};

type Card = {
  id: string;
  title: string;
  platform: string;
  account: string;
  caption: string | null;
  scheduledAt: string | null;
  compliancePass: boolean;
  complianceResult: string | null;
  publicConsent: boolean;
  creatorLicence: boolean;
  flags: Flag[];
};

const REASONS = [
  "framing",
  "pacing",
  "captions",
  "brand",
  "compliance",
  "other",
] as const;

export function ContentApprovals({ cards }: { cards: Card[] }) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [healthConfirm, setHealthConfirm] = useState<Record<string, string>>(
    {},
  );
  const [note, setNote] = useState<string | null>(null);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected],
  );

  function canOneTap(card: Card) {
    if (card.flags.some((f) => f.blocksApproval)) return false;
    if (!card.publicConsent || !card.creatorLicence) return false;
    if (!card.compliancePass) return false;
    if (card.flags.some((f) => f.blocksOneTap)) return false;
    return true;
  }

  function needsHealthConfirm(card: Card) {
    return (
      !card.compliancePass &&
      /banned health|hormone|trt|medical|claim/i.test(
        card.complianceResult ?? "",
      )
    );
  }

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-head">
        <div className="cmd-panel-title">Awaiting your approval</div>
        {selectedIds.length > 0 ? (
          <button
            type="button"
            className="cmd-btn cmd-btn-sm cmd-btn-primary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await batchApproveContentAction({
                  postCardIds: selectedIds,
                });
                const data = res?.data;
                setNote(
                  data
                    ? `Batch “${data.batchName}”: ${data.approved.length} approved, ${data.skipped.length} skipped`
                    : (res?.serverError ?? "Batch failed"),
                );
                setSelected({});
              })
            }
          >
            Approve selected ({selectedIds.length})
          </button>
        ) : null}
      </div>
      <div className="cmd-panel-body">
        {note ? <div className="cmd-section-note">{note}</div> : null}
        {cards.length === 0 ? (
          <div className="cmd-list-sub">Nothing waiting.</div>
        ) : null}
        {cards.map((card) => {
          const oneTap = canOneTap(card);
          const health = needsHealthConfirm(card);
          return (
            <div className="cmd-approval-card" key={card.id}>
              <div className="cmd-approval-top">
                <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
                  <input
                    type="checkbox"
                    checked={Boolean(selected[card.id])}
                    disabled={!oneTap || pending}
                    onChange={(e) =>
                      setSelected((s) => ({
                        ...s,
                        [card.id]: e.target.checked,
                      }))
                    }
                    aria-label={`Select ${card.title}`}
                  />
                  <div>
                    <div className="cmd-alert-id">
                      POST · {card.platform.toUpperCase()}
                    </div>
                    <div className="cmd-approval-what">{card.title}</div>
                  </div>
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
                <div>
                  <span>Consent / licence</span>
                  {[
                    card.publicConsent ? "consent ✓" : "consent ✗",
                    card.creatorLicence ? "licence ✓" : "licence ✗",
                  ].join(" · ")}
                </div>
              </div>
              {card.flags.length > 0 ? (
                <div style={{ marginTop: 8 }}>
                  <div className="cmd-list-sub">Flags (§7.5)</div>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                    {card.flags.map((f) => (
                      <li key={f.id} className="cmd-list-sub">
                        <strong>{f.label}</strong>
                        {f.blocksApproval
                          ? " [BLOCKS]"
                          : f.blocksOneTap
                            ? " [NO ONE-TAP]"
                            : ""}{" "}
                        — {f.detail}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="cmd-list-sub" style={{ marginTop: 8 }}>
                  Flags: none
                </div>
              )}
              {editingId === card.id ? (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    rows={3}
                    value={captionDraft}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    style={{ width: "100%" }}
                  />
                  <div className="cmd-approval-foot" style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="cmd-btn cmd-btn-sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await editPostCardCaptionAction({
                            postCardId: card.id,
                            caption: captionDraft,
                            approveAfter: false,
                          });
                          setEditingId(null);
                          setNote("Caption saved — approval voided");
                        })
                      }
                    >
                      Save (voids approval)
                    </button>
                    <button
                      type="button"
                      className="cmd-btn cmd-btn-sm cmd-btn-primary"
                      disabled={pending || !oneTap}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await editPostCardCaptionAction({
                            postCardId: card.id,
                            caption: captionDraft,
                            approveAfter: true,
                          });
                          setEditingId(null);
                          setNote(
                            res?.data?.approvalId
                              ? "Caption edited and scheduled"
                              : (res?.serverError ?? "Edit+approve failed"),
                          );
                        })
                      }
                    >
                      Save &amp; approve
                    </button>
                    <button
                      type="button"
                      className="cmd-btn cmd-btn-sm"
                      disabled={pending}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="cmd-list-sub" style={{ marginTop: 8 }}>
                  Caption: {card.caption?.trim() || "(none)"}
                </div>
              )}
              {health ? (
                <div className="cmd-field" style={{ marginTop: 10 }}>
                  <label htmlFor={`health-${card.id}`}>
                    Type “confirm health claim” to override FAIL
                  </label>
                  <input
                    id={`health-${card.id}`}
                    value={healthConfirm[card.id] ?? ""}
                    onChange={(e) =>
                      setHealthConfirm((s) => ({
                        ...s,
                        [card.id]: e.target.value,
                      }))
                    }
                  />
                </div>
              ) : null}
              <div className="cmd-approval-foot" style={{ flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="cmd-btn cmd-btn-sm cmd-btn-primary"
                  disabled={
                    pending ||
                    (!oneTap && !health) ||
                    (health &&
                      (healthConfirm[card.id] ?? "").trim().toLowerCase() !==
                        "confirm health claim")
                  }
                  onClick={() =>
                    startTransition(async () => {
                      const created = await createContentApprovalAction({
                        postCardId: card.id,
                        healthClaimConfirmation: healthConfirm[card.id],
                      });
                      if (created?.data?.approvalId) {
                        await decideApprovalAction({
                          id: created.data.approvalId,
                          decision: "approved",
                        });
                        setNote(`Approved ${card.title}`);
                      } else {
                        setNote(created?.serverError ?? "Approve failed");
                      }
                    })
                  }
                >
                  Approve &amp; schedule
                </button>
                <button
                  type="button"
                  className="cmd-btn cmd-btn-sm"
                  disabled={pending}
                  onClick={() => {
                    setEditingId(card.id);
                    setCaptionDraft(card.caption ?? "");
                  }}
                >
                  Edit caption
                </button>
                <select
                  aria-label="Send-back reason"
                  value={reasonById[card.id] ?? "framing"}
                  onChange={(e) =>
                    setReasonById((s) => ({
                      ...s,
                      [card.id]: e.target.value,
                    }))
                  }
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="cmd-btn cmd-btn-sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const reason = (reasonById[card.id] ??
                        "framing") as (typeof REASONS)[number];
                      await sendBackPostCardAction({
                        postCardId: card.id,
                        reason,
                      });
                      setNote(`Sent back (${reason})`);
                    })
                  }
                >
                  Send back
                </button>
                <button
                  type="button"
                  className="cmd-btn cmd-btn-sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const reason = (reasonById[card.id] ??
                        "other") as (typeof REASONS)[number];
                      await rejectPostCardAction({
                        postCardId: card.id,
                        reason,
                      });
                      setNote(`Rejected (${reason})`);
                    })
                  }
                >
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
