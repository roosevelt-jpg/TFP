"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { AdminIcons } from "@/components/admin/icons";
import type { NotificationFeed } from "@/lib/admin/notifications";

const EMPTY: NotificationFeed = {
  total: 0,
  openAlerts: 0,
  pendingApprovals: 0,
  connectorIssues: 0,
  contentAwaiting: 0,
  items: [],
  updatedAt: new Date(0).toISOString(),
};

type Props = {
  initialTotal: number;
};

export function NotificationBell({ initialTotal }: Props) {
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<NotificationFeed>({
    ...EMPTY,
    total: initialTotal,
  });
  const [live, setLive] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const applyFeed = useCallback((next: NotificationFeed) => {
    setFeed(next);
    window.dispatchEvent(
      new CustomEvent("tfp-notifications", {
        detail: { total: next.total, openAlerts: next.openAlerts },
      }),
    );
  }, []);

  useEffect(() => {
    let es: EventSource | null = null;
    let pollTimer: number | undefined;
    let cancelled = false;

    const startPoll = () => {
      const pull = async () => {
        try {
          const res = await fetch("/api/admin/notifications", {
            cache: "no-store",
          });
          if (!res.ok) return;
          const data = (await res.json()) as NotificationFeed;
          if (!cancelled) applyFeed(data);
        } catch {
          /* ignore transient errors */
        }
      };
      void pull();
      pollTimer = window.setInterval(pull, 15_000);
    };

    try {
      es = new EventSource("/api/admin/notifications/stream");
      es.addEventListener("notifications", (event) => {
        try {
          const data = JSON.parse(
            (event as MessageEvent).data,
          ) as NotificationFeed;
          if (!cancelled) {
            applyFeed(data);
            setLive(true);
          }
        } catch {
          /* ignore bad payloads */
        }
      });
      es.onerror = () => {
        setLive(false);
        es?.close();
        es = null;
        if (!cancelled && pollTimer == null) startPoll();
      };
      es.onopen = () => setLive(true);
    } catch {
      startPoll();
    }

    // Fallback poll even while SSE is up (covers proxies that buffer SSE).
    pollTimer = window.setInterval(() => {
      void fetch("/api/admin/notifications", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: NotificationFeed | null) => {
          if (data && !cancelled) applyFeed(data);
        })
        .catch(() => undefined);
    }, 30_000);

    return () => {
      cancelled = true;
      es?.close();
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [applyFeed]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const badge = feed.total > 99 ? "99+" : String(feed.total);

  return (
    <div className="cmd-notif" ref={panelRef}>
      <button
        type="button"
        className="cmd-topbar-icon-btn"
        title={
          live
            ? "Live notifications"
            : "Notifications (reconnecting…)"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <AdminIcons name="alerts" />
        {feed.total > 0 ? (
          <span className="cmd-dot-badge">{badge}</span>
        ) : null}
        <span
          className={`cmd-notif-live${live ? " on" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="cmd-notif-panel" role="dialog" aria-label="Notifications">
          <div className="cmd-notif-head">
            <div>
              <div className="cmd-notif-title">Inbox</div>
              <div className="cmd-notif-sub">
                {feed.openAlerts} alerts · {feed.pendingApprovals} approvals ·{" "}
                {feed.connectorIssues} connectors · {feed.contentAwaiting} content
              </div>
            </div>
            <Link
              href="/admin/alerts"
              className="cmd-btn cmd-btn-sm"
              onClick={() => setOpen(false)}
            >
              Open alerts
            </Link>
          </div>
          <div className="cmd-notif-list">
            {feed.items.length === 0 ? (
              <div className="cmd-notif-empty">All clear — nothing waiting.</div>
            ) : (
              feed.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`cmd-notif-item ${item.severity}`}
                  onClick={() => setOpen(false)}
                >
                  <div className="cmd-notif-item-kind">
                    {item.kind} · {item.severity.toUpperCase()}
                  </div>
                  <div className="cmd-notif-item-title">{item.title}</div>
                  <div className="cmd-notif-item-meta">
                    {formatRelative(item.at)}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatRelative(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (Number.isNaN(mins)) return "";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-GB");
}
