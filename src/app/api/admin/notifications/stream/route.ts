import { getAdminSession } from "@/lib/auth/session";
import {
  getNotificationFeed,
  getNotificationFingerprint,
} from "@/lib/admin/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events stream for the admin notification bell.
 * Polls the warehouse every few seconds and pushes when the feed changes
 * (cron-created alerts, approvals, connector failures, content gates).
 */
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let lastFingerprint = "";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const tick = async () => {
        if (closed) return;
        try {
          const fingerprint = await getNotificationFingerprint();
          if (fingerprint !== lastFingerprint) {
            lastFingerprint = fingerprint;
            const feed = await getNotificationFeed();
            send("notifications", feed);
          } else {
            send("ping", { t: Date.now() });
          }
        } catch (error) {
          send("error", {
            message: error instanceof Error ? error.message : "stream error",
          });
        }
      };

      await tick();
      const interval = setInterval(() => {
        void tick();
      }, 5_000);

      const onAbort = () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener("abort", onAbort);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
