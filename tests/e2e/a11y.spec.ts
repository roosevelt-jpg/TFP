import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The sign-up page differs by job: the waitlist form before launch, the paid
// checkout after. Both need auditing, so follow the same switch the site does.
const SIGNUP = process.env.PAYMENTS_LIVE === "true" ? "/checkout" : "/join";

const PAGES = ["/", SIGNUP, "/faq"];

for (const path of PAGES) {
  test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);

    // Reveal wrappers mount at opacity:0 and fade in via JS, which
    // reducedMotion does not stop. Give the on-screen ones a moment to settle
    // so axe doesn't sample half-faded text; this is a stabiliser, not an
    // assertion, so a slow runner must not fail the audit here.
    await page
      .waitForFunction(
        () =>
          [...document.querySelectorAll("[data-reveal]")]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.top < window.innerHeight && r.bottom > 0;
            })
            .every((el) => Number(getComputedStyle(el).opacity) === 1),
        undefined,
        { timeout: 15_000 },
      )
      .catch(() => {});

    const results = await new AxeBuilder({ page })
      // The chat mockups are aria-hidden decoration inside a phone frame. They
      // animate in message by message, so a mid-fade sample reports contrast
      // failures against a still-darkening background that no user ever sees.
      .exclude("[data-chat-mock]")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
