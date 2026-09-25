"use server";

import * as z from "zod";

import { agreeWeeklyPostingPlan } from "@/lib/content/social-manager";
import { requireAdminSession } from "@/lib/auth/session";
import { actionClient } from "@/lib/safe-action";

export const agreeWeeklyPlanAction = actionClient
  .metadata({ actionName: "admin.agreeWeeklyPlan" })
  .inputSchema(z.object({}))
  .action(async () => {
    const session = await requireAdminSession(["kane"]);
    const plan = await agreeWeeklyPostingPlan(session.user.email);
    return {
      id: plan.id,
      weekStart: plan.weekStart.toISOString().slice(0, 10),
      status: plan.status,
      agreedAt: plan.agreedAt?.toISOString() ?? null,
    };
  });
