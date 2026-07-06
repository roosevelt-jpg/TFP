import { expect, test } from "@playwright/test";

// PAYMENTS_LIVE is unset in test/CI, so the proxy must hide the
// checkout-cancelled page behind a not-found rewrite.
test("checkout-cancelled is gated while payments are off", async ({ page }) => {
  const response = await page.goto("/checkout-cancelled");

  expect(response?.status()).toBe(404);
});
