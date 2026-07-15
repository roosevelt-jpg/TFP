import { expect, test } from "@playwright/test";

import { SEEDED_PUBLIC_TOKEN, SEEDED_REF, seedConsent } from "./fixtures";

test.beforeEach(async ({ context }) => {
  await seedConsent(context);
});

test("a seeded confirmation shows the lead's reference", async ({ page }) => {
  await page.goto(`/joined?id=${SEEDED_PUBLIC_TOKEN}`);

  await expect(page.getByText(SEEDED_REF)).toBeVisible();
});

test("a bogus confirmation id shows the expired state, not an error", async ({
  page,
}) => {
  await page.goto("/joined?id=not-a-real-token");

  await expect(page.getByText("expired")).toBeVisible();
  await expect(page.getByText(SEEDED_REF)).not.toBeVisible();
});

test("a missing id shows the expired state", async ({ page }) => {
  await page.goto("/joined");

  await expect(page.getByText("expired")).toBeVisible();
});
