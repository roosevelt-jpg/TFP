import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyTurnstile } from "@/lib/turnstile";
import { env } from "@/env";

import { jsonResponse, stubFetch } from "../../helpers/fetch";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function sentBody(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>): unknown {
  const init = fetchMock.mock.calls[0]?.[1];
  return JSON.parse(String(init?.body));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verifyTurnstile", () => {
  it("rejects a missing token without calling Cloudflare", async () => {
    const fetchMock = stubFetch();

    await expect(verifyTurnstile("", "1.2.3.4", "join")).resolves.toBe(false);
    await expect(verifyTurnstile(null, "1.2.3.4", "join")).resolves.toBe(false);
    await expect(verifyTurnstile(undefined, "1.2.3.4", "join")).resolves.toBe(
      false,
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts success with the matching action and sends the full payload", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      jsonResponse({ success: true, action: "join" }),
    );

    await expect(verifyTurnstile("tok", "1.2.3.4", "join")).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      SITEVERIFY,
      expect.objectContaining({ method: "POST" }),
    );
    expect(sentBody(fetchMock)).toEqual({
      secret: env.TURNSTILE_SECRET_KEY,
      response: "tok",
      remoteip: "1.2.3.4",
    });
  });

  it("omits remoteip when the client IP is unknown", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      jsonResponse({ success: true, action: "join" }),
    );

    await expect(verifyTurnstile("tok", null, "join")).resolves.toBe(true);

    expect(sentBody(fetchMock)).toEqual({
      secret: env.TURNSTILE_SECRET_KEY,
      response: "tok",
    });
  });

  it("rejects success when the action is missing or bound to another form", async () => {
    const fetchMock = stubFetch();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(
        jsonResponse({ success: true, action: "support" }),
      );

    await expect(verifyTurnstile("tok", null, "join")).resolves.toBe(false);
    await expect(verifyTurnstile("tok", null, "join")).resolves.toBe(false);
  });

  it("rejects when Cloudflare reports failure", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      jsonResponse({ success: false, "error-codes": ["invalid-input"] }),
    );

    await expect(verifyTurnstile("tok", null, "join")).resolves.toBe(false);
  });

  it("fails closed on network errors and non-JSON responses", async () => {
    const fetchMock = stubFetch();
    fetchMock
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(new Response("<html>bad gateway</html>"));

    await expect(verifyTurnstile("tok", null, "join")).resolves.toBe(false);
    await expect(verifyTurnstile("tok", null, "join")).resolves.toBe(false);
  });
});
