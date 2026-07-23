import { expect, test } from "@playwright/test";

import { seedConsent } from "./fixtures";

test.beforeEach(async ({ context, page }) => {
  await seedConsent(context);
  await page.goto("/join");
});

test("an empty submit surfaces the field errors without leaving the page", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Join the waitlist" }).click();

  await expect(page.getByText("Enter your full name")).toBeVisible();
  await expect(page.getByText("Enter your email")).toBeVisible();
  await expect(page.getByText("Enter your WhatsApp number")).toBeVisible();
  // The profile fields are optional now, so an empty submit must not demand one.
  await expect(page.getByText("Pick a goal")).toBeHidden();
  await expect(page).toHaveURL(/\/join$/);
});

test("the minimal set (name, email, WhatsApp, consent) passes client validation", async ({
  page,
}) => {
  await page.getByLabel("Full name").fill("Jane Doe");
  await page.getByLabel("Email", { exact: true }).fill("jane@example.com");
  await page.getByLabel("WhatsApp number").fill("07911 123456");
  await page.getByRole("checkbox").check();

  await page.getByRole("button", { name: "Join the waitlist" }).click();

  // No client-side field errors block the submit; the drawer stays untouched.
  await expect(page.getByText("Enter your full name")).toBeHidden();
  await expect(page.getByText("Pick a goal")).toBeHidden();
});

test("an invalid email and landline are rejected client-side", async ({
  page,
}) => {
  await page.getByLabel("Full name").fill("Jane Doe");
  await page.getByLabel("Email", { exact: true }).fill("not-an-email");
  await page.getByLabel("WhatsApp number").fill("020 7946 0958");

  await page.getByRole("button", { name: "Join the waitlist" }).click();

  await expect(page.getByText("Enter a valid email")).toBeVisible();
  await expect(page.getByText("Enter a valid mobile number")).toBeVisible();
});

test("underage signups are refused", async ({ page }) => {
  // Age now lives in the collapsed optional section — open it before filling.
  await page.getByRole("button", { name: /optional/i }).click();
  await page.getByLabel("Age").fill("15");

  await page.getByRole("button", { name: "Join the waitlist" }).click();

  await expect(page.getByText("You must be 16 or over to join")).toBeVisible();
});

test("a validation error hidden in a collapsed drawer reopens it on submit", async ({
  page,
}) => {
  const drawer = page.getByRole("button", { name: /optional/i });

  // Fill an invalid optional field, then collapse the drawer to hide the error.
  await drawer.click();
  await expect(drawer).toHaveAttribute("aria-expanded", "true");
  await page.getByLabel("Age").fill("15");
  await drawer.click();
  await expect(drawer).toHaveAttribute("aria-expanded", "false");

  await page.getByRole("button", { name: "Join the waitlist" }).click();

  // The blocked submit must reopen the drawer so the error is visible, not a
  // silent dead end.
  await expect(drawer).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("You must be 16 or over to join")).toBeVisible();
});

// Cloudflare's always-pass TEST keys omit the `action` field that our server
// verification requires, so a dummy-key submission exercises the full
// browser → action → middleware → Turnstile wiring and ends in the server
// rejection UX. The DB-write path is covered by the unit action test.
test("a full submission round-trips to the server Turnstile rejection", async ({
  page,
}) => {
  test.skip(
    process.env.E2E_TURNSTILE_DUMMY !== "1",
    "needs the always-pass Turnstile test keys (CI)",
  );

  await page.getByLabel("Full name").fill("Jane Doe");
  await page.getByLabel("Email", { exact: true }).fill("jane.e2e@example.com");
  await page.getByLabel("WhatsApp number").fill("07911 123456");
  // The profile fields now live in the collapsed optional section.
  await page.getByRole("button", { name: /optional/i }).click();
  await page.getByRole("radio", { name: "Lose fat" }).check({ force: true });
  await page.getByRole("radio", { name: "Beginner" }).check({ force: true });
  await page
    .getByRole("radio", { name: "Female", exact: true })
    .check({ force: true });
  await page.getByLabel("Age").fill("28");
  await page.getByLabel("Height (cm)").fill("165");
  // Anchored to the start so it never matches "Goal weight (kg)"; the field's
  // accessible name now carries a trailing "Optional" tag.
  await page.getByRole("spinbutton", { name: /^Weight \(kg\)/ }).fill("60");
  await page.getByRole("checkbox").check();

  // The invisible widget mints its token asynchronously into a hidden input —
  // wait for it so a single submit deterministically reaches the server.
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(
    /.+/,
    { timeout: 15_000 },
  );

  await page.getByRole("button", { name: "Join the waitlist" }).click();

  await expect(
    page.getByText("Verification failed. Please try again."),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/join$/);
});
