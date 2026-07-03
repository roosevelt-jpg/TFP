import type { z } from "zod";

import type { waitlistFormSchema } from "./schema";

export type WaitlistFormInput = z.input<typeof waitlistFormSchema>;
export type WaitlistFormOutput = z.output<typeof waitlistFormSchema>;
