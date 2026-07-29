import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The sign-up page differs by job: the waitlist form before launch, the paid
// checkout after. Both need auditing, so follow the same switch the site does.
const SIGNUP = process.env.PAYMENTS_LIVE === "true" ? "/checkout" : "/join";

const PAGES = ["/", SIGNUP, "/faq"];

for (const path of PAGES) {
  test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
