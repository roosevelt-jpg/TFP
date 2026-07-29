import { expect, test } from "@playwright/test";

// Every payment route must be hidden behind a not-found rewrite until launch
// day. A route that 200s here is one that shipped publicly before it should
// have. The inverse — that they work once flipped — is checkout.spec.ts, which
// runs in the payments-on job.
test.skip(
  process.env.PAYMENTS_LIVE === "true",
  "payments are switched on in this job",
);

const GATED_ROUTES = ["/checkout", "/checkout-cancelled", "/success"];

// The mirror image: while payments are off the waitlist is the product, so
// these must stay reachable.
for (const route of ["/join", "/joined"]) {
  test(`${route} is open while payments are off`, async ({ page }) => {
    const response = await page.goto(route);

    expect(response?.status()).toBe(200);
  });
}

for (const route of GATED_ROUTES) {
  test(`${route} is gated while payments are off`, async ({ page }) => {
    const response = await page.goto(route);

    expect(response?.status()).toBe(404);
  });
}
