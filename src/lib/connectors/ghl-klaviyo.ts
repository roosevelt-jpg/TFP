import "server-only";

import { env } from "@/env";
import { db } from "@/db";

export async function pullKlaviyoCampaigns() {
  if (!env.KLAVIYO_API_KEY) {
    await db.connectorRun.update({
      where: { sourceId: "S4" },
      data: {
        lastRunAt: new Date(),
        lastError: "KLAVIYO_API_KEY not configured",
        status: "error",
      },
    });
    return { skipped: true as const };
  }

  const res = await fetch(
    "https://a.klaviyo.com/api/campaign-values-reports/",
    {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${env.KLAVIYO_API_KEY}`,
        revision: "2024-10-15",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        data: {
          type: "campaign-values-report",
          attributes: {
            timeframe: { key: "last_7_days" },
            conversion_metric_id: "placeholder",
            statistics: ["recipients", "opens", "clicks", "conversion_value"],
          },
        },
      }),
    },
  );

  // Klaviyo report shape varies by account metric ids — store a connector heartbeat
  // and leave detailed rows to a configured metric id in env later.
  await db.connectorRun.update({
    where: { sourceId: "S4" },
    data: {
      lastRunAt: new Date(),
      lastSuccessAt: res.ok ? new Date() : undefined,
      lastError: res.ok ? null : `HTTP ${res.status}`,
      status: res.ok ? "healthy" : "error",
    },
  });

  return { ok: res.ok };
}

/** GHL contacts/conversations — read-only. Never edit workflows. */
export async function pullGhlLeadThreads() {
  const res = await fetch(
    `https://services.leadconnectorhq.com/conversations/search?locationId=${env.GHL_LOCATION_ID}&status=unread`,
    {
      headers: {
        Authorization: `Bearer ${env.GHL_INTEGRATION_TOKEN}`,
        Version: "2021-07-28",
      },
    },
  );

  if (!res.ok) {
    await db.connectorRun.update({
      where: { sourceId: "S5" },
      data: {
        lastRunAt: new Date(),
        lastError: `HTTP ${res.status}`,
        status: "error",
      },
    });
    return { skipped: false as const, error: true as const };
  }

  const json = (await res.json()) as {
    conversations?: Array<{
      id: string;
      contactName?: string;
      lastMessageBody?: string;
      lastMessageDate?: string;
      type?: string;
    }>;
  };

  let upserts = 0;
  for (const conv of json.conversations ?? []) {
    const channel =
      conv.type?.toLowerCase().includes("instagram")
        ? "instagram"
        : conv.type?.toLowerCase().includes("whatsapp")
          ? "whatsapp"
          : "other";

    await db.leadThread.upsert({
      where: {
        channel_externalId: {
          channel,
          externalId: conv.id,
        },
      },
      create: {
        channel,
        externalId: conv.id,
        contactName: conv.contactName,
        snippet: conv.lastMessageBody?.slice(0, 280),
        lastInboundAt: conv.lastMessageDate
          ? new Date(conv.lastMessageDate)
          : new Date(),
        highIntent: /elite|price|start|join|coaching/i.test(
          conv.lastMessageBody ?? "",
        ),
        label: "verified",
        sourceFreshAt: new Date(),
      },
      update: {
        snippet: conv.lastMessageBody?.slice(0, 280),
        lastInboundAt: conv.lastMessageDate
          ? new Date(conv.lastMessageDate)
          : new Date(),
        sourceFreshAt: new Date(),
      },
    });
    upserts += 1;
  }

  await db.connectorRun.update({
    where: { sourceId: "S5" },
    data: {
      lastRunAt: new Date(),
      lastSuccessAt: new Date(),
      lastError: null,
      status: "healthy",
    },
  });

  return { upserts };
}
