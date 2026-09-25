"use server";

import * as z from "zod";

import {
  setChannelApprovalMode,
  type ApprovalMode,
} from "@/lib/content/approval-mode";
import { requireAdminSession } from "@/lib/auth/session";
import { actionClient } from "@/lib/safe-action";

const schema = z.object({
  platform: z.string().min(1),
  account: z.string().min(1),
  mode: z.enum(["every_post", "autopilot"]),
});

/** Kane-only enableForm stub — never auto-enables autopilot. */
export const setApprovalModeAction = actionClient
  .metadata({ actionName: "admin.setApprovalMode" })
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane"]);
    return setChannelApprovalMode({
      platform: parsedInput.platform,
      account: parsedInput.account,
      mode: parsedInput.mode as ApprovalMode,
      actor: session.user.email,
    });
  });
