import { expect, type Page, test } from "@playwright/test";

import { seedConsent } from "./fixtures";

// Reveal ships its content at opacity:0 in the SSR payload and relies on
// motion to fade it in. These specs pin the invariant that broke in
// production: content must also become visible when Reduce Motion is on
// (the shared e2e context already emulates reducedMotion: "reduce").
// toHaveCSS is load-bearing — toBeVisible() treats opacity:0 as visible.

test.beforeEach(async ({ context }) => {
  await seedConsent(context);
});

// Innermost styled ancestor is the Reveal wrapper carrying the opacity.
function revealWrapperOf(page: Page, text: string) {
  return page
    .locator('div[style*="opacity"]')
    .filter({ has: page.getByText(text).first() })
    .last();
}

function defineRevealSpecs() {
  test("the hero reveals on load", async ({ page }) => {
    await page.goto("/");

    await expect(revealWrapperOf(page, "The 8-week programme that")).toHaveCSS(
      "opacity",
      "1",
    );
  });

  test("a below-fold section reveals when scrolled into view", async ({
    page,
  }) => {
    await page.goto("/");

    const pricingHeader = revealWrapperOf(page, "One price. No surprises.");
    await pricingHeader.scrollIntoViewIfNeeded();

    await expect(pricingHeader).toHaveCSS("opacity", "1");
  });
}

defineRevealSpecs();

test.describe("without reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  defineRevealSpecs();
});

test.describe("with JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false });

  // The CSS rescue in globals.css: whatever kills hydration (stale chunk,
  // blocked script, in-app webview), content must never stay invisible.
  test("the hero still reveals", async ({ page }) => {
    await page.goto("/");

    await expect(revealWrapperOf(page, "The 8-week programme that")).toHaveCSS(
      "opacity",
      "1",
      { timeout: 10_000 },
    );
  });
});
