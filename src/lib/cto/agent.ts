import "server-only";

import { db } from "@/db";
import { createApprovalRequest } from "@/lib/admin/approvals";
import { STAFF_PEOPLE, type PersonKey } from "@/lib/admin/staff";
import { getTeamMonitorSnapshot } from "@/lib/admin/team-monitor";
import { runSpecialistCheck } from "@/lib/cto/specialist";
import { resolveSecret } from "@/lib/secrets/store";

type ToolCall = {
  name: string;
  input: Record<string, unknown>;
};

const SYSTEM =
  "You are the TFP CTO operator for Kane. UK English. Short, decision-led. Numbers first. Review each person's desk (KPIs, open/overdue todos, pending reports). Flag anyone skipping responsibilities. Never move money. Never touch subscriptions. Draft only — writes need Kane approval. Use query_warehouse_summary for live warehouse counts when needed.";

const DRAFT_META_PAUSE_SCHEMA = {
  type: "object",
  properties: {
    adSetId: { type: "string" },
    adSetName: { type: "string" },
    reason: { type: "string" },
  },
  required: ["adSetId", "adSetName", "reason"],
} as const;

const QUERY_WAREHOUSE_SUMMARY_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

const DRAFT_GMAIL_REPLY_SCHEMA = {
  type: "object",
  properties: {
    messageId: { type: "string" },
    threadId: { type: "string" },
    draftBody: { type: "string" },
    subject: { type: "string" },
    to: { type: "string" },
  },
  required: ["messageId", "draftBody"],
} as const;

const FLAG_TEAM_GAP_SCHEMA = {
  type: "object",
  properties: {
    personKey: {
      type: "string",
      description: "leah | lemoni | indigo | asim",
    },
    title: { type: "string" },
    note: { type: "string" },
  },
  required: ["personKey", "note"],
} as const;

const GEMINI_FUNCTION_DECLARATIONS = [
  {
    name: "draft_meta_pause",
    description: "Draft a Meta ad set pause for Kane approval",
    parameters: DRAFT_META_PAUSE_SCHEMA,
  },
  {
    name: "query_warehouse_summary",
    description:
      "Read-only warehouse summary: open alerts, yesterday snapshot, pending approvals, low stock, past_due subscriptions",
    parameters: QUERY_WAREHOUSE_SUMMARY_SCHEMA,
  },
  {
    name: "draft_gmail_reply",
    description: "Draft a Gmail reply for Kane approval (does not send)",
    parameters: DRAFT_GMAIL_REPLY_SCHEMA,
  },
  {
    name: "flag_team_gap",
    description:
      "Flag a team gap: creates a staff todo (or audit note) for a personKey",
    parameters: FLAG_TEAM_GAP_SCHEMA,
  },
] as const;

const CLAUDE_TOOLS = [
  {
    name: "draft_meta_pause",
    description: "Draft a Meta ad set pause for Kane approval",
    input_schema: DRAFT_META_PAUSE_SCHEMA,
  },
  {
    name: "query_warehouse_summary",
    description:
      "Read-only warehouse summary: open alerts, yesterday snapshot, pending approvals, low stock, past_due subscriptions",
    input_schema: QUERY_WAREHOUSE_SUMMARY_SCHEMA,
  },
  {
    name: "draft_gmail_reply",
    description: "Draft a Gmail reply for Kane approval (does not send)",
    input_schema: DRAFT_GMAIL_REPLY_SCHEMA,
  },
  {
    name: "flag_team_gap",
    description:
      "Flag a team gap: creates a staff todo (or audit note) for a personKey",
    input_schema: FLAG_TEAM_GAP_SCHEMA,
  },
] as const;

/**
 * CTO agent — Gemini (preferred) or Claude tool-use.
 * Reads warehouse + team desks, drafts actions, never executes writes.
 */
export async function runCtoAgent(prompt: string) {
  const geminiKey = await resolveSecret("GEMINI_API_KEY");
  const anthropicKey = await resolveSecret("ANTHROPIC_API_KEY");

  if (!geminiKey && !anthropicKey) {
    return {
      text: "GEMINI_API_KEY not configured — CTO agent idle. Add it under Integrations → CTO agent.",
      approvals: [] as string[],
    };
  }

  const openAlerts = await db.alert.findMany({
    where: { status: "open" },
    take: 10,
    orderBy: { firedAt: "desc" },
  });
  const snap = await db.dailySnapshot.findFirst({ orderBy: { date: "desc" } });
  const team = await getTeamMonitorSnapshot();

  const context = {
    snap,
    openAlerts: openAlerts.map((a) => ({
      ruleId: a.ruleId,
      severity: a.severity,
      title: a.title,
    })),
    teamDesks: team,
  };

  const userMessage = `${prompt}\n\nWarehouse + team context:\n${JSON.stringify(context)}`;

  const { text: modelText, toolCalls, provider } = geminiKey
    ? await callGemini(geminiKey, userMessage)
    : await callClaude(anthropicKey!, userMessage);

  const approvals: string[] = [];
  const toolNotes: string[] = [];
  const flagged: string[] = [];

  for (const call of toolCalls) {
    if (call.name === "query_warehouse_summary") {
      const summary = await queryWarehouseSummary();
      toolNotes.push(
        `Warehouse summary (read tool):\n${JSON.stringify(summary)}`,
      );
      continue;
    }

    if (call.name === "draft_meta_pause") {
      const input = call.input;
      const check = await runSpecialistCheck({
        action: `Pause ad set "${String(input.adSetName)}"`,
        objectIds: { adSetId: String(input.adSetId) },
        domain: "meta",
        afterState: { status: "PAUSED", reason: input.reason },
      });
      if (!check.ok) continue;
      const approval = await createApprovalRequest({
        action: `Pause ad set "${String(input.adSetName)}"`,
        objectIds: { adSetId: String(input.adSetId) },
        reach: "1 ad set",
        reversible: true,
        specialistVerdict: `${check.verdict} · ${String(input.reason)}`,
        createdBy: "cto-agent",
      });
      approvals.push(approval.id);
      continue;
    }

    if (call.name === "draft_gmail_reply") {
      const messageId = String(call.input.messageId ?? "");
      const draftBody = String(call.input.draftBody ?? "");
      if (!messageId || !draftBody) continue;

      const threadId =
        typeof call.input.threadId === "string"
          ? call.input.threadId
          : undefined;
      const subject =
        typeof call.input.subject === "string" ? call.input.subject : undefined;
      const to = typeof call.input.to === "string" ? call.input.to : undefined;

      const objectIds: Record<string, string> = {
        messageId,
        draftBody,
      };
      if (threadId) objectIds.threadId = threadId;

      const check = await runSpecialistCheck({
        action: `Send drafted Gmail reply${subject ? `: ${subject}` : ""}`,
        objectIds,
        domain: "gmail",
        afterState: { draftBody, subject, to },
      });
      if (!check.ok) {
        toolNotes.push(
          `draft_gmail_reply blocked: ${check.blockedReason ?? check.verdict}`,
        );
        continue;
      }

      const approval = await createApprovalRequest({
        action: `Send drafted reply${to ? ` to ${to}` : ""}${subject ? `: ${subject}` : ""}`,
        objectIds,
        afterState: { draftBody, subject, to },
        reach: "1 external email",
        reversible: false,
        specialistVerdict: check.verdict,
        createdBy: "cto-agent",
      });
      approvals.push(approval.id);
      continue;
    }

    if (call.name === "flag_team_gap") {
      const result = await flagTeamGap({
        personKey: String(call.input.personKey ?? ""),
        note: String(call.input.note ?? ""),
        title:
          typeof call.input.title === "string" ? call.input.title : undefined,
      });
      flagged.push(result.summary);
      toolNotes.push(result.summary);
    }
  }

  const text = [modelText, ...toolNotes].filter(Boolean).join("\n\n");

  await db.auditLog.create({
    data: {
      actor: "cto-agent",
      action: "cto.run",
      meta: {
        prompt,
        provider,
        approvals,
        flagged,
        text: text.slice(0, 2000),
      },
    },
  });

  return { text, approvals };
}

async function queryWarehouseSummary() {
  const now = new Date();
  const yesterday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
  );

  const stockLowThreshold = 30;

  const [
    openAlerts,
    yesterdaySnapshot,
    pendingApprovals,
    lowStock,
    pastDueSubs,
  ] = await Promise.all([
    db.alert.count({ where: { status: "open" } }),
    db.dailySnapshot.findFirst({
      where: { date: yesterday },
    }),
    db.approvalRequest.count({ where: { status: "pending" } }),
    db.stockItem.count({
      where: { daysOfCover: { not: null, lt: stockLowThreshold } },
    }),
    db.subscription.count({ where: { status: "past_due" } }),
  ]);

  return {
    openAlerts,
    yesterdaySnapshot: yesterdaySnapshot
      ? {
          date: yesterdaySnapshot.date.toISOString().slice(0, 10),
          revenuePence: yesterdaySnapshot.revenuePence,
          adSpendPence: yesterdaySnapshot.adSpendPence,
          contributionPence: yesterdaySnapshot.contributionPence,
          newLeads: yesterdaySnapshot.newLeads,
          amer: yesterdaySnapshot.amer,
        }
      : null,
    pendingApprovals,
    lowStock,
    pastDueSubs,
  };
}

async function flagTeamGap(input: {
  personKey: string;
  note: string;
  title?: string;
}) {
  const person = STAFF_PEOPLE.find((p) => p.personKey === input.personKey);
  const title =
    input.title?.trim() ||
    `Gap flagged: ${input.note.slice(0, 120)}` ||
    "Team gap flagged by CTO";

  if (person) {
    const user = await db.user.findFirst({
      where: { role: person.personKey as PersonKey },
    });
    const todo = await db.staffTodo.create({
      data: {
        personKey: person.personKey,
        userId: user?.id,
        title,
        source: "system",
        createdBy: "cto-agent",
      },
    });
    await db.auditLog.create({
      data: {
        actor: "cto-agent",
        action: "cto.flag_team_gap",
        entityType: "StaffTodo",
        entityId: todo.id,
        meta: {
          personKey: person.personKey,
          note: input.note,
          title,
        },
      },
    });
    return {
      summary: `flag_team_gap: todo ${todo.id} for ${person.personKey} — ${title}`,
    };
  }

  await db.auditLog.create({
    data: {
      actor: "cto-agent",
      action: "cto.flag_team_gap",
      meta: {
        personKey: input.personKey,
        note: input.note,
        title,
        storedAs: "audit_note",
      },
    },
  });
  return {
    summary: `flag_team_gap: audit note for ${input.personKey} — ${title}`,
  };
}

async function callGemini(apiKey: string, userMessage: string) {
  const model =
    (await resolveSecret("GEMINI_MODEL")) ?? "gemini-2.5-flash";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        tools: [
          {
            functionDeclarations: GEMINI_FUNCTION_DECLARATIONS,
          },
        ],
        generationConfig: { maxOutputTokens: 1200 },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini error: ${body.slice(0, 400)}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          functionCall?: {
            name?: string;
            args?: Record<string, unknown>;
          };
        }>;
      };
    }>;
  };

  const parts = json.candidates?.[0]?.content?.parts ?? [];
  let text = "";
  const toolCalls: ToolCall[] = [];

  for (const part of parts) {
    if (part.text) text += part.text;
    if (part.functionCall?.name) {
      toolCalls.push({
        name: part.functionCall.name,
        input: part.functionCall.args ?? {},
      });
    }
  }

  return { text, toolCalls, provider: `gemini:${model}` as const };
}

async function callClaude(apiKey: string, userMessage: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-20250514",
      max_tokens: 1200,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      tools: CLAUDE_TOOLS,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude error: ${body.slice(0, 400)}`);
  }

  const json = (await res.json()) as {
    content: Array<
      | { type: "text"; text: string }
      | { type: "tool_use"; name: string; input: Record<string, unknown> }
    >;
  };

  let text = "";
  const toolCalls: ToolCall[] = [];
  for (const block of json.content) {
    if (block.type === "text") text += block.text;
    if (block.type === "tool_use") {
      toolCalls.push({ name: block.name, input: block.input });
    }
  }

  return { text, toolCalls, provider: "anthropic" as const };
}
