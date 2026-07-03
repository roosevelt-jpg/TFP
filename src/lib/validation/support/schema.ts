import { isValidPhoneNumber } from "libphonenumber-js/mobile";
import * as z from "zod";

import { emailField, nameField } from "@/lib/validation/waitlist/fields";

import { SUPPORT_TYPE_VALUES } from "./options";

export const supportSchema = z
  .object({
    name: nameField,
    email: emailField,
    type: z.enum(SUPPORT_TYPE_VALUES),
    whatsapp: z.string().trim().optional(),
    message: z
      .string()
      .trim()
      .max(2000, { error: "Keep it under 2000 characters" })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "wa") {
      if (!data.whatsapp || !isValidPhoneNumber(data.whatsapp, "GB")) {
        ctx.addIssue({
          code: "custom",
          path: ["whatsapp"],
          error: "Enter a valid mobile number",
        });
      }
    }
  });

export type SupportFormValues = z.input<typeof supportSchema>;
