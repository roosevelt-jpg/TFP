import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (process.env.PAYMENTS_LIVE === "true") {
    return NextResponse.next();
  }

  return NextResponse.rewrite(
    new URL("/checkout-cancelled/not-found", request.url),
  );
}

// The payment-only routes. Add future ones here (e.g. a Stripe success page).
export const config = {
  matcher: ["/checkout-cancelled"],
};
