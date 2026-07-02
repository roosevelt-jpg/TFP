import * as z from "zod";

import {
  ageField,
  consentField,
  dietField,
  emailField,
  goalField,
  goalWeightField,
  heightField,
  honeypotField,
  injuriesField,
  levelField,
  nameField,
  renderedAtField,
  sexField,
  weightField,
  whatsappField,
} from "./fields";

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
  honeypot: honeypotField,
  renderedAt: renderedAtField,
});
