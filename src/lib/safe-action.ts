import { createSafeActionClient } from "next-safe-action";
import * as z from "zod";

import { isAppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import { rateLimitMiddleware } from "@/lib/middleware/rate-limit";

export const actionClient = createSafeActionClient({
  defineMetadataSchema: () => z.object({ actionName: z.string() }),
  handleServerError: (error) => {
    if (isAppError(error)) return error.message;

    logger.error("Unhandled server action error", error);

    return "Something went wrong. Please try again.";
  },
}).use(rateLimitMiddleware);
