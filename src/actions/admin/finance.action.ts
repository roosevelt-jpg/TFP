"use server";

import * as z from "zod";

import { persistLeahFinanceCsv } from "@/lib/finance/persist-leah-csv";
import { requireAdminSession } from "@/lib/auth/session";
import { actionClient } from "@/lib/safe-action";

const schema = z.object({
  csv: z.string().min(10).max(500_000),
});

export const uploadFinanceCsvAction = actionClient
  .metadata({ actionName: "admin.uploadFinanceCsv" })
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const session = await requireAdminSession(["kane", "leah"]);
    return persistLeahFinanceCsv({
      csv: parsedInput.csv,
      actor: session.user.email,
    });
  });
