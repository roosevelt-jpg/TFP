"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { AdminIcons } from "@/components/admin/icons";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { saveCmsFieldAction } from "@/actions/admin/cms.action";

type Props = {
  title: string;
  openAlertCount: number;
  canEditCms: boolean;
};

export function AdminTopbar({ title, openAlertCount, canEditCms }: Props) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [cmsOn, setCmsOn] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    const stored = window.localStorage.getItem("tfpAdminTheme");
    const mode = stored === "light" ? "light" : "dark";
    setTheme(mode);
    document.querySelector(".tfp-command")?.setAttribute("data-theme", mode);
  }, []);

  useEffect(() => {
    const root = document.querySelector(".tfp-command");
    if (!root) return;

    const apply = () => {
      root.classList.toggle("cms-on", cmsOn);
      root.querySelectorAll<HTMLElement>("[data-cms]").forEach((el) => {
        el.contentEditable = cmsOn ? "true" : "false";
        el.spellcheck = false;
      });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [cmsOn, pathname]);

  useEffect(() => {
    if (!cmsOn) return;
    const onBlur = (event: FocusEvent) => {
      const el = event.target as HTMLElement | null;
      if (!el?.hasAttribute("data-cms") || !el.isContentEditable) return;
      const key = el.getAttribute("data-cms");
      if (!key) return;
      const value = el.innerText.trim();
      setSaveState("saving");
      startTransition(async () => {
        const result = await saveCmsFieldAction({
          namespace: "admin",
          key,
          value,
        });
        if (result?.serverError || result?.validationErrors) {
          setSaveState("error");
          return;
        }
        setSaveState("saved");
        window.setTimeout(() => setSaveState("idle"), 1800);
      });
    };
    document.addEventListener("focusout", onBlur, true);
    return () => document.removeEventListener("focusout", onBlur, true);
  }, [cmsOn]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("tfpAdminTheme", next);
    document.querySelector(".tfp-command")?.setAttribute("data-theme", next);
  }

  return (
    <div className="cmd-topbar">
      <div>
        <div className="cmd-crumb">TFP Command</div>
        <h1 className="cmd-page-title">{title}</h1>
      </div>
      <div className="cmd-topbar-actions">
        <div className="cmd-topbar-search">
          <AdminIcons name="search" />
          Search orders, threads, people…
        </div>
        {canEditCms ? (
          <button
            type="button"
            className="cmd-topbar-toggle"
            onClick={() => setCmsOn((v) => !v)}
          >
            Edit content
            <span className={`cmd-switch${cmsOn ? " on" : ""}`} />
          </button>
        ) : null}
        {cmsOn ? (
          <span className="cmd-cms-save-status" data-state={saveState}>
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved"
                : saveState === "error"
                  ? "Save failed"
                  : "Edit mode"}
          </span>
        ) : null}
        <button
          type="button"
          className="cmd-topbar-toggle"
          onClick={toggleTheme}
        >
          <span>{theme === "light" ? "Light" : "Dark"}</span>
          <span className={`cmd-switch${theme === "light" ? " on" : ""}`} />
        </button>
        <NotificationBell initialTotal={openAlertCount} />
        <Link
          href="/admin/settings"
          className="cmd-topbar-icon-btn"
          title="Settings"
        >
          <AdminIcons name="settings" />
        </Link>
      </div>
    </div>
  );
}
