import { createSafeActionClient } from "next-safe-action";
import * as z from "zod";

import { isAppError } from "./errors/app-error";

export const actionClient = createSafeActionClient({
  defineMetadataSchema: () => z.object({ actionName: z.string() }),
  handleServerError: (error) => {
    if (isAppError(error)) return error.message;
    console.error("[action] unhandled server error:", error);
    return "Something went wrong. Please try again.";
  },
});
