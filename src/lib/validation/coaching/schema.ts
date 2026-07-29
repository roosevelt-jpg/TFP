import * as z from "zod";

import {
  ageField,
  ageFormField,
  dietField,
  goalField,
  goalFormField,
  goalWeightField,
  goalWeightFormField,
  heightField,
  heightFormField,
  injuriesField,
  levelField,
  levelFormField,
  sexField,
  sexFormField,
  weightField,
  weightFormField,
} from "@/lib/validation/waitlist/fields";

const shared = {
  diet: dietField,
  injuries: injuriesField,
};

export const coachingFormSchema = z.object({
  goal: goalFormField,
  level: levelFormField,
  sex: sexFormField,
  age: ageFormField,
  heightCm: heightFormField,
  weightKg: weightFormField,
  goalWeightKg: goalWeightFormField,
  ...shared,
});

export const coachingSchema = z.object({
  sessionId: z.string().trim().min(1),
  goal: goalField,
  level: levelField,
  sex: sexField,
  age: ageField,
  heightCm: heightField,
  weightKg: weightField,
  goalWeightKg: goalWeightField,
  ...shared,
});

export type CoachingFormInput = z.input<typeof coachingFormSchema>;
export type CoachingFormOutput = z.output<typeof coachingFormSchema>;
