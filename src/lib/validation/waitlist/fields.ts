import { isValidPhoneNumber } from "libphonenumber-js/mobile";
import * as z from "zod";

import { DIET_VALUES, GOAL_VALUES, LEVEL_VALUES, SEX_VALUES } from "./options";

type NumberRange = {
  label: string;
  min: number;
  max: number;
  tooLow?: string;
  tooHigh?: string;
};

const domainNumber = ({ label, min, max, tooLow, tooHigh }: NumberRange) =>
  z
    .number({ error: `${label} must be a number` })
    .int({ error: `${label} must be a whole number` })
    .min(min, { error: tooLow ?? `${label} looks too low` })
    .max(max, { error: tooHigh ?? `${label} looks too high` });

const optionalNumber = (range: NumberRange) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : Number(v)))
    .pipe(domainNumber(range).optional());

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

export const goalField = z
  .enum(GOAL_VALUES, { error: "Pick a goal" })
  .optional();
export const levelField = z
  .enum(LEVEL_VALUES, { error: "Pick your experience level" })
  .optional();
export const sexField = z.enum(SEX_VALUES, { error: "Select one" }).optional();

const AGE_RANGE: NumberRange = {
  label: "Age",
  min: 16,
  max: 100,
  tooLow: "You must be 16 or over to join",
  tooHigh: "That age looks too high",
};
const HEIGHT_RANGE: NumberRange = { label: "Height", min: 120, max: 272 };
const WEIGHT_RANGE: NumberRange = { label: "Weight", min: 35, max: 300 };
const GOAL_WEIGHT_RANGE: NumberRange = {
  label: "Goal weight",
  min: 35,
  max: 300,
};

export const ageField = domainNumber(AGE_RANGE).optional();
export const heightField = domainNumber(HEIGHT_RANGE).optional();
export const weightField = domainNumber(WEIGHT_RANGE).optional();

// Optional string-in enum: RHF fields are strings, so keep the input string
// ("" → undefined) rather than z.preprocess (which widens input to unknown and
// breaks the SegmentedControl value typing).
const optionalEnum = <const T extends readonly [string, ...string[]]>(
  values: T,
  error: string,
) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(z.enum(values, { error }).optional());

export const goalFormField = optionalEnum(GOAL_VALUES, "Pick a goal");
export const levelFormField = optionalEnum(
  LEVEL_VALUES,
  "Pick your experience level",
);
export const sexFormField = optionalEnum(SEX_VALUES, "Select one");

export const ageFormField = optionalNumber(AGE_RANGE);
export const heightFormField = optionalNumber(HEIGHT_RANGE);
export const weightFormField = optionalNumber(WEIGHT_RANGE);

export const goalWeightField = domainNumber(GOAL_WEIGHT_RANGE).optional();
export const goalWeightFormField = optionalNumber(GOAL_WEIGHT_RANGE);

export const injuriesField = z
  .string()
  .trim()
  .max(300, { error: "Keep it under 300 characters" })
  .optional();

export const dietField = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.enum(DIET_VALUES).optional(),
);

const attributionString = z.string().trim().max(300).optional();

export const attributionField = z
  .object({
    utmSource: attributionString,
    utmMedium: attributionString,
    utmCampaign: attributionString,
    utmContent: attributionString,
    utmTerm: attributionString,
    fbclid: attributionString,
    gclid: attributionString,
    referrer: z.string().trim().max(1000).optional(),
    landingPath: z.string().trim().max(1000).optional(),
    capturedAt: z.iso.datetime().optional().catch(undefined),
  })
  .optional();

export const turnstileTokenField = z
  .string()
  .min(1, { error: "Please complete the verification" });

export const consentField = z.literal(true, {
  error: "You must agree to continue",
});

export const consentFormField = z
  .boolean()
  .pipe(z.literal(true, { error: "You must agree to continue" }));
