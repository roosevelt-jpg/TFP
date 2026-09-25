import "server-only";

import { db } from "@/db";
import { resolveSecret } from "@/lib/secrets/store";

const KLAVIYO_REVISION = "2024-10-15";

const PLACED_ORDER_NAME =
  /\b(placed order|placed.?order|order placed|checkout completed|placed an order)\b/i;

/**
 * Prefer KLAVIYO_CONVERSION_METRIC_ID (secret/env). Otherwise list metrics and
 * pick Placed Order / equivalent; fall back to the first metric if none match.
 */
export async function resolveKlaviyoConversionMetricId(
  apiKey: string,
): Promise<string | null> {
  const configured = await resolveSecret("KLAVIYO_CONVERSION_METRIC_ID");
  if (configured?.trim()) return configured.trim();

  const res = await fetch("https://a.klaviyo.com/api/metrics/?page[size]=100", {
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      revision: KLAVIYO_REVISION,
      accept: "application/json",
    },
  });
  if (!res.ok) return null;

  const body = (await res.json()) as {
    data?: Array<{
      id?: string;
      attributes?: { name?: string };
    }>;
  };
  const metrics = body.data ?? [];
  const placed = metrics.find((m) =>
    PLACED_ORDER_NAME.test(m.attributes?.name ?? ""),
  );
  const pick = placed ?? metrics[0];
  return pick?.id ?? null;
}

export async function pullKlaviyoCampaigns() {
  const apiKey = await resolveSecret("KLAVIYO_API_KEY");
  if (!apiKey) {
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

  const conversionMetricId = await resolveKlaviyoConversionMetricId(apiKey);
  if (!conversionMetricId) {
    await db.connectorRun.update({
      where: { sourceId: "S4" },
      data: {
        lastRunAt: new Date(),
        lastError:
          "KLAVIYO_CONVERSION_METRIC_ID missing and metrics list unavailable",
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
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: KLAVIYO_REVISION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        data: {
          type: "campaign-values-report",
          attributes: {
            timeframe: { key: "last_7_days" },
            conversion_metric_id: conversionMetricId,
            statistics: ["recipients", "opens", "clicks", "conversion_value"],
          },
        },
      }),
    },
  );

  // Klaviyo report shape varies — heartbeat + optional EmailDaily rows when stats present.
  if (res.ok) {
    try {
      const body = (await res.json()) as {
        data?: {
          attributes?: {
            results?: Array<{
              campaign_id?: string;
              campaign_name?: string;
              recipients?: number;
              opens?: number;
              clicks?: number;
              conversion_value?: number;
            }>;
          };
        };
      };
      const results = body.data?.attributes?.results ?? [];
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      for (const row of results.slice(0, 20)) {
        const name = row.campaign_name ?? row.campaign_id ?? "Klaviyo campaign";
        await db.emailDaily.create({
          data: {
            date: today,
            name,
            kind: "campaign",
            recipients: row.recipients ?? 0,
            opens: row.opens ?? 0,
            clicks: row.clicks ?? 0,
            revenuePence: Math.round((row.conversion_value ?? 0) * 100),
            label: "verified",
            sourceFreshAt: new Date(),
          },
        });
      }
    } catch {
      // Heartbeat still recorded below.
    }
  }

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
  const token = await resolveSecret("GHL_INTEGRATION_TOKEN");
  const locationId = await resolveSecret("GHL_LOCATION_ID");
  if (!token || !locationId) {
    await db.connectorRun.update({
      where: { sourceId: "S5" },
      data: {
        lastRunAt: new Date(),
        lastError: "GHL_* credentials not configured",
        status: "error",
      },
    });
    return { skipped: true as const };
  }

  const res = await fetch(
    `https://services.leadconnectorhq.com/conversations/search?locationId=${locationId}&status=unread`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
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
      assignedTo?: string | { name?: string; email?: string } | null;
      followers?: Array<{ name?: string; email?: string }>;
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

    const assigned =
      typeof conv.assignedTo === "string"
        ? conv.assignedTo
        : conv.assignedTo?.name ??
          conv.assignedTo?.email ??
          conv.followers?.[0]?.name ??
          conv.followers?.[0]?.email ??
          null;
    const setterKey = assigned?.trim() || null;

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
        setterKey,
        label: "verified",
        sourceFreshAt: new Date(),
      },
      update: {
        snippet: conv.lastMessageBody?.slice(0, 280),
        lastInboundAt: conv.lastMessageDate
          ? new Date(conv.lastMessageDate)
          : new Date(),
        ...(setterKey ? { setterKey } : {}),
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
