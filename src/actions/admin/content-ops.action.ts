"use server";

import * as z from "zod";

import { pauseAccount, pauseAllPosting } from "@/lib/content/ops";
import { requireAdminSession } from "@/lib/auth/session";
import { actionClient } from "@/lib/safe-action";

export const pauseAllPostingAction = actionClient
  .metadata({ actionName: "admin.pauseAllPosting" })
  .inputSchema(z.object({}))
  .action(async () => {
    const session = await requireAdminSession(["kane"]);
    return pauseAllPosting(session.user.email);
  });

export const pauseAccountAction = actionClient
  .metadata({ actionName: "admin.pauseAccount" })
  .inputSchema(
    z.object({
      platform: z.string().min(1),
      account: z.string().min(1),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    return pauseAccount(
      parsedInput.platform,
      parsedInput.account,
      session.user.email,
    );
  });
