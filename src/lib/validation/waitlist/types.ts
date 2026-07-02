import type { z } from "zod";

import type { waitlistSchema } from "./schema";

export type WaitlistFormValues = z.input<typeof waitlistSchema>;
