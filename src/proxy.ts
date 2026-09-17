import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Waitlist routes, retired the moment payments open. The site stops being a
// waitlist at that point, so this copy must not be reachable at all.
const WAITLIST_ROUTES = ["/join", "/joined"];

export function proxy(request: NextRequest) {
  const live = process.env.PAYMENTS_LIVE === "true";
  const { pathname, search } = request.nextUrl;

  // /admin auth is enforced in the AdminShell / Better Auth session layer.
  // Proxy only keeps marketing waitlist/checkout gates.

  if (WAITLIST_ROUTES.includes(pathname)) {
    if (!live) return NextResponse.next();

    return NextResponse.redirect(new URL(`/checkout${search}`, request.url));
  }

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/telegram") ||
    pathname.startsWith("/api/frame") ||
    pathname.startsWith("/api/admin")
  ) {
    return NextResponse.next();
  }

  if (live) return NextResponse.next();

  if (
    pathname === "/checkout" ||
    pathname === "/checkout-cancelled" ||
    pathname === "/success"
  ) {
    return NextResponse.rewrite(new URL("/payments-not-live", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/checkout",
    "/checkout-cancelled",
    "/success",
    "/join",
    "/joined",
    "/admin/:path*",
    "/api/auth/:path*",
    "/api/telegram/:path*",
    "/api/frame/:path*",
    "/api/admin/:path*",
  ],
};
