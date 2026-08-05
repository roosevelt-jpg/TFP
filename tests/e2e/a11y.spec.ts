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
    // reducedMotion does not stop. Auditing before the on-screen ones settle
    // samples half-faded text and reports contrast failures no user ever sees.
    // Only in-viewport reveals are checked: the rest animate on scroll and
    // would never resolve.
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            [...document.querySelectorAll("[data-reveal]")]
              .filter((el) => {
                const r = el.getBoundingClientRect();
                return r.top < window.innerHeight && r.bottom > 0;
              })
              .every((el) => Number(getComputedStyle(el).opacity) === 1),
          ),
        { timeout: 10_000 },
      )
      .toBe(true);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
