import "server-only";

import { env } from "@/env";
import { db } from "@/db";
import { createApprovalRequest } from "@/lib/admin/approvals";

type ToolCall = {
  name: string;
  input: Record<string, unknown>;
};

/**
 * CTO agent — Claude tool-use loop.
 * Reads warehouse context, drafts actions, never executes writes.
 */
export async function runCtoAgent(prompt: string) {
  if (!env.ANTHROPIC_API_KEY) {
    return {
      text: "ANTHROPIC_API_KEY not configured — CTO agent idle.",
      approvals: [] as string[],
    };
  }

  const openAlerts = await db.alert.findMany({
    where: { status: "open" },
    take: 10,
    orderBy: { firedAt: "desc" },
  });
  const snap = await db.dailySnapshot.findFirst({ orderBy: { date: "desc" } });

  const context = {
    snap,
    openAlerts: openAlerts.map((a) => ({
      ruleId: a.ruleId,
      severity: a.severity,
      title: a.title,
    })),
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-20250514",
      max_tokens: 1200,
      system:
        "You are the TFP CTO operator for Kane. UK English. Short, decision-led. Numbers first. Never move money. Never touch subscriptions. Draft only — writes need Kane approval.",
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nWarehouse context:\n${JSON.stringify(context)}`,
        },
      ],
      tools: [
        {
          name: "draft_meta_pause",
          description: "Draft a Meta ad set pause for Kane approval",
          input_schema: {
            type: "object",
            properties: {
              adSetId: { type: "string" },
              adSetName: { type: "string" },
              reason: { type: "string" },
            },
            required: ["adSetId", "adSetName", "reason"],
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude error: ${text.slice(0, 400)}`);
  }

  const json = (await res.json()) as {
    content: Array<
      | { type: "text"; text: string }
      | { type: "tool_use"; name: string; input: Record<string, unknown> }
    >;
  };

  const approvals: string[] = [];
  let text = "";

  for (const block of json.content) {
    if (block.type === "text") text += block.text;
    if (block.type === "tool_use" && block.name === "draft_meta_pause") {
      const input = block.input as ToolCall["input"];
      if (/subscription|kaching|loop/i.test(String(input.reason ?? ""))) {
        continue;
      }
      const approval = await createApprovalRequest({
        action: `Pause ad set "${String(input.adSetName)}"`,
        objectIds: { adSetId: String(input.adSetId) },
        reach: "1 ad set",
        reversible: true,
        specialistVerdict: String(input.reason),
        createdBy: "cto-agent",
      });
      approvals.push(approval.id);
    }
  }

  await db.auditLog.create({
    data: {
      actor: "cto-agent",
      action: "cto.run",
      meta: { prompt, approvals, text: text.slice(0, 2000) },
    },
  });

  return { text, approvals };
}
