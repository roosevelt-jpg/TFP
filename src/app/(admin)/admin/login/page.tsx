import { Suspense } from "react";

import AdminLoginForm from "./login-form";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="tfp-command cmd-auth-shell" data-theme="dark">
          <div className="cmd-auth-card">
            <div className="cmd-auth-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="cmd-auth-logo"
                src="/logo.svg"
                alt=""
              />
            </div>
            Loading…
          </div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
