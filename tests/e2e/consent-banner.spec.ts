import { expect, test } from "@playwright/test";

const banner = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Cookies and analytics" });

test("first visit shows the banner until a choice is made", async ({
  page,
}) => {
  await page.goto("/");

  await expect(banner(page)).toBeVisible();
  await expect(
    banner(page).getByRole("button", { name: "Accept" }),
  ).toBeVisible();
  await expect(
    banner(page).getByRole("button", { name: "Decline" }),
  ).toBeVisible();
});

test("accepting stores the choice and keeps the banner away after reload", async ({
  page,
}) => {
  await page.goto("/");
  await banner(page).getByRole("button", { name: "Accept" }).click();

  await expect(banner(page)).toBeHidden();
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "tfp_tracking_consent")?.value).toBe(
    "granted",
  );

  await page.reload();
  await expect(banner(page)).toBeHidden();
});

test("declining stores the choice", async ({ page }) => {
  await page.goto("/");
  await banner(page).getByRole("button", { name: "Decline" }).click();

  await expect(banner(page)).toBeHidden();
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "tfp_tracking_consent")?.value).toBe(
    "denied",
  );
});

test("the privacy page control clears the choice and reopens the banner", async ({
  page,
}) => {
  await page.goto("/");
  await banner(page).getByRole("button", { name: "Decline" }).click();

  await page.goto("/privacy");
  await page.getByRole("button", { name: "Change my cookie choice" }).click();

  await expect(banner(page)).toBeVisible();
  const cookies = await page.context().cookies();
  expect(
    cookies.find((c) => c.name === "tfp_tracking_consent"),
  ).toBeUndefined();
});
