import Link from "next/link";

import { Mail } from "lucide-react";

const MANAGE_LINKS = [
  { label: "Update my details", href: "/support?type=wa" },
  { label: "Leave the waitlist", href: "/support?type=cancel" },
  { label: "Contact us", href: "/support" },
];

export function ConfirmedInbox() {
  return (
    <div className="mt-[clamp(34px,5vw,48px)] grid gap-3.5">
      <div className="bg-bg-2 border-hairline flex items-start gap-3 rounded-xs border px-[18px] py-4">
        <Mail
          size={18}
          strokeWidth={2}
          aria-hidden
          className="text-muted mt-px shrink-0"
        />
        <p className="text-muted text-[0.9rem] leading-relaxed">
          A confirmation email is on its way. We’ll email you the moment early
          access opens.{" "}
          <span className="text-dim">
            Didn’t get it in a few minutes? Check spam or{" "}
            <Link href="/support" className="text-text">
              resend it
            </Link>
            .
          </span>
        </p>
      </div>
      <nav
        aria-label="Manage your waitlist entry"
        className="text-dim flex flex-wrap items-center justify-center gap-x-1 text-[0.82rem]"
      >
        {MANAGE_LINKS.map((link, i) => (
          <span key={link.href} className="flex items-center gap-x-1">
            <Link
              href={link.href}
              className="text-muted hover:text-text inline-flex min-h-[44px] items-center px-2 transition-colors"
            >
              {link.label}
            </Link>
            {i < MANAGE_LINKS.length - 1 && (
              <span
                aria-hidden
                className="bg-hairline-strong size-[3px] rounded-full"
              />
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}
