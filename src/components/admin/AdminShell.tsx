import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { requireAdminSession } from "@/lib/auth/session";
import { getNotificationFeed } from "@/lib/admin/notifications";
import { ADMIN_TITLES } from "@/lib/admin/nav";
import { commandBody, commandDisplay, commandMono } from "@/app/(admin)/fonts";
import "@/app/(admin)/admin.css";

type Props = {
  children: ReactNode;
  titleKey: keyof typeof ADMIN_TITLES | string;
};

export async function AdminShell({ children, titleKey }: Props) {
  const session = await requireAdminSession();
  const notifications = await getNotificationFeed();
  const title = ADMIN_TITLES[titleKey] ?? titleKey;
  const roleLabel =
    session.user.role === "kane"
      ? "CEO · full access"
      : `${session.user.role} · limited`;

  return (
    <div
      className={`tfp-command ${commandDisplay.variable} ${commandBody.variable} ${commandMono.variable}`}
      data-theme="dark"
    >
      <div className="cmd-app">
        <AdminSidebar
          userName={session.user.name}
          userRole={roleLabel}
          openAlertCount={notifications.total}
          image={session.user.image}
        />
        <div className="cmd-main">
          <AdminTopbar
            title={title}
            openAlertCount={notifications.total}
            canEditCms={
              session.user.role === "kane" || session.user.role === "lemoni"
            }
          />
          <div className="cmd-content">
            <div className="cmd-cms-banner">
              Edit mode is on — click any highlighted value to rewrite it.
              Changes save to Postgres.
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
