import { expect, test } from "@playwright/test";

import { seedConsent } from "./fixtures";

test.beforeEach(async ({ context }) => {
  await seedConsent(context);
});

const SIGNUP = process.env.PAYMENTS_LIVE === "true" ? "/checkout" : "/join";

const PAGES = ["/", SIGNUP, "/faq", "/how-it-works", "/support"];

for (const path of PAGES) {
  test(`${path} renders with a heading`, async ({ page }) => {
    // CSP violations surface only as console errors — a missed origin would
    // otherwise break trackers/widgets silently.
    const cspViolations: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error" && message.text().includes("Refused to"))
        cspViolations.push(message.text());
    });

    await page.goto(path);

    await expect(page).toHaveTitle(/The Formula Programme/);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    expect(cspViolations).toEqual([]);
  });
}

test("the home page routes to the sign-up form", async ({ page }) => {
  await page.goto("/");

  await page
    .locator(`a[href="${SIGNUP}"]`)
    .filter({ visible: true })
    .first()
    .click();

  await expect(page).toHaveURL(new RegExp(`${SIGNUP}$`));
  // Landing on the page is not enough: the form has to be there to submit.
  await expect(
    page.getByRole("button", {
      name:
        process.env.PAYMENTS_LIVE === "true"
          ? "Continue to Secure Payment"
          : "Join the waitlist",
    }),
  ).toBeVisible();
});
