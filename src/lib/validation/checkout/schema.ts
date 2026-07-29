import * as z from "zod";

import {
  attributionField,
  consentField,
  consentFormField,
  emailField,
  nameField,
  turnstileTokenField,
  whatsappField,
} from "@/lib/validation/waitlist/fields";

// Only what's needed to charge someone and reach them. The coaching questions
// (goal, weight, injuries…) are asked after payment, so nothing has to be held
// server-side while the buyer is on Stripe's domain.
//
// Reuses the waitlist field definitions so validation rules and error copy
// behave identically on both forms.

// Entered on our page rather than hunted for on Stripe's: their field is a
// collapsed "Add promotion code" link that buyers miss. Loose here because
// Stripe is the authority on whether a code is real; this only rejects input
// that could not be one.
const promoCodeField = z
  .string()
  .trim()
  .max(50)
  .regex(/^[A-Za-z0-9_-]*$/, { error: "Enter a valid code" })
  .optional();

export const checkoutSchema = z.object({
  name: nameField,
  email: emailField,
  whatsapp: whatsappField,
  consent: consentField,
  attribution: attributionField,
  turnstileToken: turnstileTokenField,
  // Waitlist publicToken from a launch-email link. Untrusted: it only links the
  // purchase for attribution, never grants anything.
  waitlistToken: z.string().trim().max(100).optional(),
  promoCode: promoCodeField,
});

export const checkoutFormSchema = z.object({
  name: nameField,
  email: emailField,
  whatsapp: whatsappField,
  consent: consentFormField,
  turnstileToken: turnstileTokenField,
  promoCode: promoCodeField,
});

export type CheckoutFormInput = z.input<typeof checkoutFormSchema>;
export type CheckoutFormOutput = z.output<typeof checkoutFormSchema>;
