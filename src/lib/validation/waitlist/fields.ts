import { isValidPhoneNumber } from "libphonenumber-js/mobile";
import * as z from "zod";

import { DIET_VALUES, GOAL_VALUES, LEVEL_VALUES, SEX_VALUES } from "./options";

// Form inputs arrive as strings; validate a required whole number in range.
const requiredNumber = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} is required` })
    .transform((v) => Number(v))
    .pipe(
      z
        .number({ error: `${label} must be a number` })
        .int({ error: `${label} must be a whole number` })
        .min(min, { error: `${label} looks too low` })
        .max(max, { error: `${label} looks too high` }),
    );

export const nameField = z
  .string()
  .trim()
  .min(2, { error: "Enter your full name" })
  .max(80, { error: "That name is too long" });

export const emailField = z
  .string()
  .trim()
  .min(1, { error: "Enter your email" })
  .pipe(z.email({ error: "Enter a valid email" }).max(120));

export const whatsappField = z
  .string()
  .trim()
  .min(1, { error: "Enter your WhatsApp number" })
  .refine((v) => isValidPhoneNumber(v, "GB"), {
    error: "Enter a valid mobile number",
  });

export const goalField = z.enum(GOAL_VALUES, { error: "Pick a goal" });
export const levelField = z.enum(LEVEL_VALUES, {
  error: "Pick your experience level",
});
export const sexField = z.enum(SEX_VALUES, { error: "Select one" });

export const ageField = requiredNumber("Age", 16, 100);
export const heightField = requiredNumber("Height", 120, 250);
export const weightField = requiredNumber("Weight", 35, 300);

export const goalWeightField = z.string().trim().max(4).optional();

export const injuriesField = z
  .string()
  .trim()
  .max(300, { error: "Keep it under 300 characters" })
  .optional();

// The select submits "" when untouched; treat that as "no preference".
export const dietField = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.enum(DIET_VALUES).optional(),
);

export const consentField = z.literal(true, {
  error: "You must agree to continue",
});

export const honeypotField = z.literal("").optional();
export const renderedAtField = z.coerce.number().optional();
