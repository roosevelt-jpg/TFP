import "@/app/(admin)/admin.css";

export default function AdminLoading() {
  return (
    <div className="tfp-command" data-theme="dark" style={{ minHeight: "100vh" }}>
      <div className="cmd-app">
        <aside className="cmd-sidebar" aria-hidden>
          <div className="cmd-brand">
            <div className="cmd-brand-mark">TF</div>
            <div>
              <div className="cmd-brand-name">TFP Command</div>
              <div className="cmd-brand-sub">Loading…</div>
            </div>
          </div>
        </aside>
        <div className="cmd-main">
          <div className="cmd-content" style={{ paddingTop: 48 }}>
            <div className="cmd-panel">
              <div className="cmd-panel-body">
                <p style={{ color: "var(--cmd-text-muted)", margin: 0 }}>
                  Loading page…
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
