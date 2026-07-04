import { createSafeActionClient } from "next-safe-action";
import * as z from "zod";

import { isAppError } from "@/lib/errors/app-error";
import { rateLimitMiddleware } from "@/lib/middleware/rate-limit";

export const actionClient = createSafeActionClient({
  defineMetadataSchema: () => z.object({ actionName: z.string() }),
  handleServerError: (error) => {
    if (isAppError(error)) return error.message;
    console.error("[action] unhandled server error:", error);
    return "Something went wrong. Please try again.";
  },
}).use(rateLimitMiddleware);
