"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ADMIN_NAV } from "@/lib/admin/nav";
import { AdminIcons } from "@/components/admin/icons";

type Props = {
  userName: string;
  userRole: string;
  openAlertCount: number;
  image?: string | null;
};

export function AdminSidebar({
  userName,
  userRole,
  openAlertCount,
  image,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(openAlertCount);
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    setAlertCount(openAlertCount);
  }, [openAlertCount]);

  useEffect(() => {
    const onFeed = (event: Event) => {
      const detail = (event as CustomEvent<{ total?: number; openAlerts?: number }>)
        .detail;
      if (typeof detail?.total === "number") setAlertCount(detail.total);
    };
    window.addEventListener("tfp-notifications", onFeed);
    return () => window.removeEventListener("tfp-notifications", onFeed);
  }, []);

  return (
    <>
      <button
        type="button"
        className="cmd-hamburger"
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
      >
        <AdminIcons name="menu" />
      </button>
      {open ? (
        <button
          type="button"
          className="cmd-sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside className={`cmd-sidebar${open ? " open" : ""}`}>
        <div className="cmd-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="cmd-sidebar-logo"
            src="/logo.svg"
            alt="The Formula Programme"
          />
        </div>
        <nav className="cmd-nav">
          {ADMIN_NAV.map((group) => (
            <div key={group.group}>
              <div className="cmd-nav-group">{group.group}</div>
              {group.items.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                const count =
                  item.id === "alerts" ? alertCount : item.count;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`cmd-nav-item${active ? " active" : ""}${item.urgent && count ? " has-p1" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    <AdminIcons name={item.icon} />
                    <span>{item.label}</span>
                    {count ? <span className="count">{count}</span> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="cmd-sidebar-foot">
          <div className="cmd-avatar">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" />
            ) : (
              initials || "KM"
            )}
          </div>
          <div>
            <div className="cmd-sf-name">{userName}</div>
            <div className="cmd-sf-role">{userRole}</div>
          </div>
        </div>
      </aside>
    </>
  );
}
