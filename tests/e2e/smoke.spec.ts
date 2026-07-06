import { expect, test } from "@playwright/test";

const PAGES = ["/", "/join", "/faq", "/how-it-works", "/support"];

for (const path of PAGES) {
  test(`${path} renders with a heading`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveTitle(/The Formula Programme/);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });
}

test("the home page routes to the join form", async ({ page }) => {
  await page.goto("/");

  await page
    .locator('a[href="/join"]')
    .filter({ visible: true })
    .first()
    .click();

  await expect(page).toHaveURL(/\/join$/);
  await expect(
    page.getByRole("button", { name: "Join the waitlist" }),
  ).toBeVisible();
});
