import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Waitlist routes, retired the moment payments open. The site stops being a
// waitlist at that point, so this copy must not be reachable at all.
const WAITLIST_ROUTES = ["/join", "/joined"];

export function proxy(request: NextRequest) {
  const live = process.env.PAYMENTS_LIVE === "true";
  const { pathname, search } = request.nextUrl;

  if (WAITLIST_ROUTES.includes(pathname)) {
    if (!live) return NextResponse.next();

    // Redirected rather than 404'd: every waitlist email links here, and those
    // people are precisely the launch audience. The token rides along so a
    // launch-email link still prefills checkout.
    return NextResponse.redirect(new URL(`/checkout${search}`, request.url));
  }

  if (live) return NextResponse.next();

  // Rewrite to a path that matches no route, which renders the 404 page. The
  // segment is arbitrary; it just has to not exist.
  return NextResponse.rewrite(new URL("/_payments-not-live", request.url));
}

// Must be literal: Next analyses this statically at build time, so a spread or
// a reference to the const above fails the build. Keep it in sync with
// WAITLIST_ROUTES — a route missing here is reachable in both states.
export const config = {
  matcher: ["/checkout", "/checkout-cancelled", "/success", "/join", "/joined"],
};
