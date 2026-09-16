import "server-only";

import { env } from "@/env";
import { db } from "@/db";
import { siteConfig } from "@/config/site";

const CHECK_PATHS = [
  "/",
  "/checkout",
  "/how-it-works",
] as const;

export async function runUptimeChecks() {
  const base = env.NEXT_PUBLIC_APP_URL || siteConfig.url;
  const results: Array<{ path: string; ok: boolean; ms: number; status?: number }> =
    [];

  for (const path of CHECK_PATHS) {
    const started = Date.now();
    try {
      const res = await fetch(new URL(path, base), {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(8_000),
      });
      results.push({
        path,
        ok: res.status > 0 && res.status < 500,
        ms: Date.now() - started,
        status: res.status,
      });
    } catch {
      results.push({ path, ok: false, ms: Date.now() - started });
    }
  }

  const failed = results.filter((r) => !r.ok);
  await db.connectorRun.update({
    where: { sourceId: "S11" },
    data: {
      lastRunAt: new Date(),
      lastSuccessAt: failed.length === 0 ? new Date() : undefined,
      lastError:
        failed.length === 0
          ? null
          : failed.map((f) => `${f.path}:${f.status ?? "down"}`).join(", "),
      status: failed.length === 0 ? "healthy" : "error",
    },
  });

  if (failed.length) {
    const threadKey = `UPTIME-${failed.map((f) => f.path).join("|")}`;
    const existing = await db.alert.findFirst({
      where: { threadKey, status: { in: ["open", "acknowledged"] } },
    });
    if (!existing) {
      await db.alert.create({
        data: {
          ruleId: "SY1",
          severity: "p1",
          title: `Uptime check failed: ${failed.map((f) => f.path).join(", ")}`,
          payload: { results },
          threadKey,
        },
      });
    }
  }

  return { results, failed: failed.length };
}

export async function pullN8nStatus() {
  if (!env.N8N_API_URL || !env.N8N_API_KEY) {
    await db.connectorRun.update({
      where: { sourceId: "S6" },
      data: {
        lastRunAt: new Date(),
        lastError: "N8N_* not configured",
        status: "error",
      },
    });
    return { skipped: true as const };
  }

  const res = await fetch(
    new URL("/api/v1/executions?limit=20", env.N8N_API_URL),
    {
      headers: { "X-N8N-API-KEY": env.N8N_API_KEY },
    },
  );

  if (!res.ok) {
    await db.connectorRun.update({
      where: { sourceId: "S6" },
      data: {
        lastRunAt: new Date(),
        lastError: `HTTP ${res.status}`,
        status: "error",
      },
    });
    return { ok: false as const };
  }

  const json = (await res.json()) as {
    data?: Array<{ finished?: boolean; stoppedAt?: string; status?: string; workflowId?: string }>;
  };

  const failures = (json.data ?? []).filter(
    (e) => e.status === "error" || e.status === "crashed",
  );

  for (const fail of failures) {
    const threadKey = `N8N-${fail.workflowId ?? "unknown"}`;
    const existing = await db.alert.findFirst({
      where: { threadKey, status: { in: ["open", "acknowledged"] } },
    });
    if (existing) continue;
    await db.alert.create({
      data: {
        ruleId: "SY2",
        severity: "p1",
        title: `n8n workflow failure: ${fail.workflowId ?? "unknown"}`,
        payload: fail as object,
        threadKey,
      },
    });
  }

  await db.connectorRun.update({
    where: { sourceId: "S6" },
    data: {
      lastRunAt: new Date(),
      lastSuccessAt: new Date(),
      lastError: null,
      status: "healthy",
    },
  });

  return { failures: failures.length };
}
