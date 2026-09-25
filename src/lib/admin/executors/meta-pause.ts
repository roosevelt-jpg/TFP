import "server-only";

import { db } from "@/db";
import { resolveSecret } from "@/lib/secrets/store";

export type MetaPauseResult = {
  ok: boolean;
  verification: string;
  beforeStatus?: string;
  afterStatus?: string;
  changeEventId?: string;
};

/**
 * Pause a Meta ad set via Marketing API, then read status back for verification.
 */
export async function executeMetaAdSetPause(adSetId: string): Promise<MetaPauseResult> {
  const accessToken = await resolveSecret("META_ACCESS_TOKEN");
  if (!accessToken) {
    return {
      ok: false,
      verification: "META_ACCESS_TOKEN missing — pause not executed",
    };
  }

  const beforeRes = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(adSetId)}?fields=id,name,status,effective_status&access_token=${encodeURIComponent(accessToken)}`,
  );
  const beforeJson = (await beforeRes.json()) as {
    id?: string;
    name?: string;
    status?: string;
    effective_status?: string;
    error?: { message?: string };
  };
  if (!beforeRes.ok) {
    return {
      ok: false,
      verification: `Meta read failed before pause: ${beforeJson.error?.message ?? beforeRes.status}`,
    };
  }

  const beforeStatus = beforeJson.effective_status ?? beforeJson.status ?? "unknown";

  const pauseRes = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(adSetId)}`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        status: "PAUSED",
        access_token: accessToken,
      }),
    },
  );
  const pauseJson = (await pauseRes.json()) as {
    success?: boolean;
    error?: { message?: string };
  };
  if (!pauseRes.ok || pauseJson.success === false) {
    return {
      ok: false,
      beforeStatus,
      verification: `Meta pause failed: ${pauseJson.error?.message ?? pauseRes.status}`,
    };
  }

  const afterRes = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(adSetId)}?fields=id,name,status,effective_status&access_token=${encodeURIComponent(accessToken)}`,
  );
  const afterJson = (await afterRes.json()) as {
    status?: string;
    effective_status?: string;
    name?: string;
    error?: { message?: string };
  };
  if (!afterRes.ok) {
    return {
      ok: false,
      beforeStatus,
      verification: `Paused but verification read failed: ${afterJson.error?.message ?? afterRes.status}`,
    };
  }

  const afterStatus = afterJson.effective_status ?? afterJson.status ?? "unknown";
  const paused =
    afterStatus === "PAUSED" || afterStatus === "CAMPAIGN_PAUSED";

  if (!paused) {
    return {
      ok: false,
      beforeStatus,
      afterStatus,
      verification: `Pause requested but effective_status is ${afterStatus} (was ${beforeStatus})`,
    };
  }

  const change = await db.changeEvent.create({
    data: {
      objectType: "ad_set",
      objectId: adSetId,
      changeType: "pause",
      occurredAt: new Date(),
      meta: {
        beforeStatus,
        afterStatus,
        name: afterJson.name ?? null,
        source: "meta_pause_executor",
      },
    },
  });

  return {
    ok: true,
    beforeStatus,
    afterStatus,
    changeEventId: change.id,
    verification: `Verified PAUSED · ${afterJson.name ?? adSetId} · ${beforeStatus} → ${afterStatus}`,
  };
}
