import { recordFunnelEvent } from "@/lib/funnel/records";

const SESSION = /^[A-Za-z0-9_-]{8,80}$/;

/** One qualified landing session per browser session per UTC day. */
export async function POST(request: Request) {
  let sessionId = "";
  try {
    const body = (await request.json()) as { sessionId?: string };
    sessionId = body.sessionId ?? "";
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!SESSION.test(sessionId)) {
    return Response.json({ error: "Invalid session" }, { status: 400 });
  }

  const day = new Date().toISOString().slice(0, 10);
  await recordFunnelEvent({
    eventName: "landing_view",
    source: "web",
    sessionId,
    eventId: `landing:${sessionId}:${day}`,
    properties: { funnelVersion: "funnel-v2" },
  });
  return Response.json({ ok: true });
}
