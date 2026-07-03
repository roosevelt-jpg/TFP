import * as z from "zod";

import {
  ageField,
  ageFormField,
  consentField,
  consentFormField,
  dietField,
  emailField,
  goalField,
  goalFormField,
  goalWeightField,
  heightField,
  heightFormField,
  injuriesField,
  levelField,
  levelFormField,
  nameField,
  sexField,
  sexFormField,
  weightField,
  weightFormField,
  whatsappField,
} from "./fields";

// Server-side truth: coerces/transforms raw input into the persisted shape.
export const waitlistSchema = z.object({
  name: nameField,
  email: emailField,
  whatsapp: whatsappField,
  goal: goalField,
  level: levelField,
  sex: sexField,
  age: ageField,
  heightCm: heightField,
  weightKg: weightField,
  goalWeightKg: goalWeightField,
  diet: dietField,
  injuries: injuriesField,
  consent: consentField,
});

// Client-side mirror: field types match what controlled inputs hold (empty
// selects, string numerics, boolean consent) so the inferred form type has no
// input/output skew and defaultValues need no casts.
export const waitlistFormSchema = z.object({
  name: nameField,
  email: emailField,
  whatsapp: whatsappField,
  goal: goalFormField,
  level: levelFormField,
  sex: sexFormField,
  age: ageFormField,
  heightCm: heightFormField,
  weightKg: weightFormField,
  goalWeightKg: goalWeightField,
  diet: dietField,
  injuries: injuriesField,
  consent: consentFormField,
});
