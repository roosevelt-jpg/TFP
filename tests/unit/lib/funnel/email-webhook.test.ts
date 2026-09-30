import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyResendWebhook } from "@/lib/funnel/email-webhook-verify";

const SECRET = `whsec_${Buffer.from("test-secret-key").toString("base64")}`;

function signed(payload: string, id: string, timestamp: string) {
  const raw = Buffer.from("test-secret-key");
  const sig = createHmac("sha256", raw)
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");
  return new Headers({
    "svix-id": id,
    "svix-timestamp": timestamp,
    "svix-signature": `v1,${sig}`,
  });
}

describe("verifyResendWebhook", () => {
  const now = 1_700_000_000_000;
  const timestamp = String(now / 1000);

  it("accepts a valid signature", () => {
    const payload = JSON.stringify({ type: "email.delivered" });
    const headers = signed(payload, "msg_1", timestamp);
    expect(verifyResendWebhook(payload, headers, SECRET, now)).toEqual({
      ok: true,
      id: "msg_1",
    });
  });

  it("rejects a tampered body", () => {
    const headers = signed("{}", "msg_1", timestamp);
    const result = verifyResendWebhook(
      JSON.stringify({ type: "email.bounced" }),
      headers,
      SECRET,
      now,
    );
    expect(result).toEqual({ ok: false, reason: "signature" });
  });

  it("rejects a stale timestamp", () => {
    const payload = "{}";
    const headers = signed(payload, "msg_1", "100");
    expect(verifyResendWebhook(payload, headers, SECRET, now)).toEqual({
      ok: false,
      reason: "stale",
    });
  });
});
