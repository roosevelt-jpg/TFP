import { expect, test } from "@playwright/test";

import { seedConsent } from "./fixtures";

// Only runs in the payments E2E job, which sets PAYMENTS_LIVE=true. The default
// job asserts the opposite (proxy.spec.ts), and both truths matter: gated
// before launch, working once enabled.
test.skip(
  process.env.PAYMENTS_LIVE !== "true",
  "payments routes are gated off in this job",
);

test.beforeEach(async ({ context, page }) => {
  await seedConsent(context);
  await page.goto("/checkout");
});

test.describe("order summary", () => {
  // The client's hard requirement: a buyer who does not see the rollover asks
  // for a refund when the first £79 lands. Pinned so nobody quietly moves it.
  test("states the rollover above the pay button", async ({ page }) => {
    const disclosure = page.getByText(
      "£149 today for the 8-week programme, then £79 a month. Cancel anytime.",
    );

    await expect(disclosure).toBeVisible();

    const cta = page.getByRole("button", {
      name: "Continue to Secure Payment",
    });
    const disclosureBox = await disclosure.boundingBox();
    const ctaBox = await cta.boundingBox();

    expect(disclosureBox?.y).toBeLessThan(ctaBox?.y ?? 0);
  });

  test("shows both prices", async ({ page }) => {
    await expect(page.getByText("£149").first()).toBeVisible();
    await expect(page.getByText("£79").first()).toBeVisible();
  });
});

// Stripe's own promo field is a collapsed link that buyers were missing, so
// this one has to be visible without hunting.
test.describe("the promo code field", () => {
  test("is on the page, optional, and not hidden behind anything", async ({
    page,
  }) => {
    const promo = page.getByLabel(/promo code/i);

    await expect(promo).toBeVisible();
    await expect(promo).toBeEditable();
  });

  test("does not block a submit when left blank", async ({ page }) => {
    await page
      .getByRole("button", { name: "Continue to Secure Payment" })
      .click();

    // Every other field complains; this one must not.
    await expect(page.getByText("Enter your full name")).toBeVisible();
    await expect(page.getByText(/code isn’t valid/i)).toBeHidden();
  });
});

test.describe("intake validation", () => {
  // Same field definitions as the waitlist, so the copy must match exactly.
  test("an empty submit surfaces every field error without leaving the page", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: "Continue to Secure Payment" })
      .click();

    await expect(page.getByText("Enter your full name")).toBeVisible();
    await expect(page.getByText("Enter your email")).toBeVisible();
    await expect(page.getByText("Enter your WhatsApp number")).toBeVisible();
    await expect(page.getByText("You must agree to continue")).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);
  });

  test("rejects an invalid email and a landline", async ({ page }) => {
    await page.getByLabel("Full name").fill("Jane Doe");
    await page.getByLabel("Email", { exact: true }).fill("not-an-email");
    await page.getByLabel("WhatsApp number").fill("020 7946 0958");

    await page
      .getByRole("button", { name: "Continue to Secure Payment" })
      .click();

    await expect(page.getByText("Enter a valid email")).toBeVisible();
    await expect(page.getByText("Enter a valid mobile number")).toBeVisible();
  });

  // Consent is the legal basis for coaching them by WhatsApp, so it can never
  // become optional by accident.
  test("refuses to proceed without consent", async ({ page }) => {
    await page.getByLabel("Full name").fill("Jane Doe");
    await page.getByLabel("Email", { exact: true }).fill("jane@example.com");
    await page.getByLabel("WhatsApp number").fill("07911 123456");

    await page
      .getByRole("button", { name: "Continue to Secure Payment" })
      .click();

    await expect(page.getByText("You must agree to continue")).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);
  });
});

// Cloudflare's always-pass test keys omit the `action` field our server
// verification requires, so a browser submit can never reach Stripe here — the
// same reason the waitlist spec asserts its rejection instead. What this does
// prove is the whole path up to that point: form → action → rate limit →
// Turnstile verification, and that a rejection leaves the buyer able to retry.
test.describe("a full submission", () => {
  test("round-trips to the server and comes back retryable", async ({
    page,
  }) => {
    test.skip(
      process.env.E2E_TURNSTILE_DUMMY !== "1",
      "needs the always-pass Turnstile test keys (CI)",
    );

    await page.getByLabel("Full name").fill("Jane Doe");
    await page
      .getByLabel("Email", { exact: true })
      .fill("jane.checkout@example.com");
    await page.getByLabel("WhatsApp number").fill("07911 123456");
    await page.getByRole("checkbox").check();

    // The invisible widget mints its token asynchronously, so waiting for it
    // makes a single submit deterministically reach the server.
    await expect(
      page.locator('input[name="cf-turnstile-response"]'),
    ).toHaveValue(/.+/, { timeout: 15_000 });

    await page
      .getByRole("button", { name: "Continue to Secure Payment" })
      .click();

    await expect(
      page.getByText("Verification failed. Please try again."),
    ).toBeVisible({ timeout: 15_000 });

    // A buyer whose payment attempt fails must always be able to try again:
    // a button stuck pending is a lost sale.
    await expect(
      page.getByRole("button", { name: "Continue to Secure Payment" }),
    ).toBeEnabled();
  });
});

// The site stops being a waitlist the moment payments open, so this copy must
// not be reachable. Redirected rather than 404'd because every waitlist email
// links here, and those people are the launch audience.
test.describe("the retired waitlist", () => {
  test("sends /join to checkout", async ({ page }) => {
    await page.goto("/join");

    await expect(page).toHaveURL(/\/checkout$/);
  });

  test("keeps the token so a launch link still prefills", async ({ page }) => {
    await page.goto("/joined?t=some-token");

    await expect(page).toHaveURL(/\/checkout\?t=some-token$/);
  });

  test("shows no waitlist copy anywhere", async ({ page }) => {
    await page.goto("/join");

    await expect(page.getByText("Join the waitlist")).toBeHidden();
  });
});

test.describe("the success page", () => {
  // session_id is attacker-supplied, so the page verifies it with Stripe rather
  // than trusting the query string. It explains itself and points at support
  // instead of redirecting: someone who has genuinely paid must never be
  // bounced to the form with no explanation.
  test("refuses a session id that is not ours", async ({ page }) => {
    await page.goto("/success?session_id=cs_test_bogus");

    await expect(page.getByText("We can’t find that")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Talk to the Team" }),
    ).toBeVisible();
  });

  test("refuses a missing session id", async ({ page }) => {
    await page.goto("/success");

    await expect(page.getByText("We can’t find that")).toBeVisible();
  });

  // The paid view is the only thing that must never render off an unverified
  // id, since it is what tells someone their payment worked.
  test("shows nothing that looks like a confirmed purchase", async ({
    page,
  }) => {
    await page.goto("/success?session_id=cs_test_bogus");

    await expect(page.getByText("Let’s get to work.")).toBeHidden();
  });
});
