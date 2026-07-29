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
});

export const checkoutFormSchema = z.object({
  name: nameField,
  email: emailField,
  whatsapp: whatsappField,
  consent: consentFormField,
  turnstileToken: turnstileTokenField,
});

export type CheckoutFormInput = z.input<typeof checkoutFormSchema>;
export type CheckoutFormOutput = z.output<typeof checkoutFormSchema>;
