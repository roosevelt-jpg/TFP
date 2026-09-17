"use client";

import type { GrowthThread } from "@/lib/admin/growth-channels";

type Props = {
  channelLabel: string;
  aiHandledHint: string;
  threads: GrowthThread[];
  canRespond: boolean;
};

export function GrowthInbox({
  channelLabel,
  aiHandledHint,
  threads,
  canRespond,
}: Props) {
  const humanQueue = threads.filter((t) => t.needsHuman);
  const aiQueue = threads.filter((t) => !t.needsHuman);

  return (
    <>
      <div className="cmd-section-note">
        {aiHandledHint}{" "}
        {canRespond
          ? "You can claim and respond to human-needed threads below."
          : "Your role is view-only on this channel."}
      </div>

      <div className="cmd-two-col">
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div>
              <div className="cmd-panel-title">Needs human</div>
              <div className="cmd-panel-sub">
                {humanQueue.length} · {channelLabel}
              </div>
            </div>
          </div>
          <div className="cmd-panel-body">
            {humanQueue.length === 0 ? (
              <div className="cmd-list-sub">AI is covering the inbox</div>
            ) : (
              humanQueue.map((thread) => (
                <div
                  key={thread.id}
                  className={`cmd-alert-card ${thread.highIntent ? "p1" : "p2"}`}
                >
                  <div>
                    <div className="cmd-alert-id">
                      {thread.channel.toUpperCase()} · {thread.externalId}
                    </div>
                    <div className="cmd-alert-what">{thread.snippet}</div>
                    <div className="cmd-alert-meta">
                      <span>{thread.contactName}</span>
                      <span>
                        {thread.lastInboundAt
                          ? new Date(thread.lastInboundAt).toLocaleString(
                              "en-GB",
                            )
                          : "—"}
                      </span>
                      <span className="cmd-badge cmd-badge-calculated">
                        human
                      </span>
                    </div>
                    {canRespond ? (
                      <div className="cmd-list-sub" style={{ marginTop: 8 }}>
                        Respond in GHL / native app — mark resolved after reply.
                        CTO will stop auto-drafting once claimed.
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div>
              <div className="cmd-panel-title">AI handling</div>
              <div className="cmd-panel-sub">
                {aiQueue.length} · autonomous unless escalated
              </div>
            </div>
          </div>
          <div className="cmd-panel-body">
            {aiQueue.length === 0 ? (
              <div className="cmd-list-sub">No quiet threads</div>
            ) : (
              aiQueue.map((thread) => (
                <div key={thread.id} className="cmd-alert-card p3">
                  <div>
                    <div className="cmd-alert-id">
                      {thread.channel.toUpperCase()} · {thread.externalId}
                    </div>
                    <div className="cmd-alert-what">{thread.snippet}</div>
                    <div className="cmd-alert-meta">
                      <span>{thread.contactName}</span>
                      <span className="cmd-badge cmd-badge-verified">AI</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
