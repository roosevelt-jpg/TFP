import { afterEach, describe, expect, it, vi } from "vitest";

import { GhlError, upsertGhlContact } from "@/lib/clients/ghl";
import { env } from "@/env";

import { jsonResponse, stubFetch } from "../../../helpers/fetch";

const input = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "+447911123456",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GhlError classification", () => {
  it.each([
    400, 401, 403, 404, 422,
  ])("treats %i as permanent — retrying won't change the outcome", (status) => {
    expect(new GhlError(status, "body").permanent).toBe(true);
  });

  it.each([
    408, 409, 423, 429, 500, 502, 503,
  ])("treats %i as transient so the task retries instead of aborting", (status) => {
    expect(new GhlError(status, "body").permanent).toBe(false);
  });

  it("caps the echoed response body in the message", () => {
    const error = new GhlError(400, "x".repeat(500));

    expect(error.message.length).toBeLessThan(400);
    expect(error.message).toContain("GHL request failed (400)");
  });
});

describe("upsertGhlContact", () => {
  it("posts the upsert contract and reports an existing contact", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(jsonResponse({ contact: { id: "c_1" } }));

    const result = await upsertGhlContact(input);

    expect(result).toEqual({ isNew: false, contactId: "c_1" });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://services.leadconnectorhq.com/contacts/upsert");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      `Bearer ${env.GHL_INTEGRATION_TOKEN}`,
    );
    expect(new Headers(init?.headers).get("version")).toBe("2021-07-28");
    expect(JSON.parse(String(init?.body))).toEqual({
      locationId: env.GHL_LOCATION_ID,
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "+447911123456",
    });
  });

  it("flags a newly created contact and passes optional fields through", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      jsonResponse({ new: true, contact: { id: "c_2" } }),
    );

    const result = await upsertGhlContact({
      ...input,
      source: "Waitlist Website",
      tags: ["waitlist"],
      customFields: [{ id: "f1", field_value: "Lose fat" }],
    });

    expect(result).toEqual({ isNew: true, contactId: "c_2" });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      source: "Waitlist Website",
      tags: ["waitlist"],
      customFields: [{ id: "f1", field_value: "Lose fat" }],
    });
  });

  it("parses Retry-After delta-seconds on a 429", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      jsonResponse(
        { message: "rate limited" },
        { status: 429, headers: { "retry-after": "30" } },
      ),
    );

    await expect(upsertGhlContact(input)).rejects.toMatchObject({
      name: "GhlError",
      status: 429,
      permanent: false,
      retryAfterMs: 30_000,
    });
  });

  it("parses an HTTP-date Retry-After into a forward delay", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      jsonResponse(
        { message: "rate limited" },
        {
          status: 429,
          headers: {
            "retry-after": new Date(Date.now() + 60_000).toUTCString(),
          },
        },
      ),
    );

    const error = await upsertGhlContact(input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GhlError);
    if (error instanceof GhlError) {
      expect(error.retryAfterMs).toBeGreaterThan(50_000);
      expect(error.retryAfterMs).toBeLessThanOrEqual(60_000);
    }
  });

  it("clamps a past HTTP-date to zero and ignores garbage", async () => {
    const fetchMock = stubFetch();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          {},
          {
            status: 429,
            headers: {
              "retry-after": new Date(Date.now() - 60_000).toUTCString(),
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {},
          { status: 429, headers: { "retry-after": "soonish" } },
        ),
      );

    await expect(upsertGhlContact(input)).rejects.toMatchObject({
      retryAfterMs: 0,
    });
    await expect(upsertGhlContact(input)).rejects.toMatchObject({
      retryAfterMs: undefined,
    });
  });

  it("treats a 2xx without a contact id as a plain (retryable) error", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(jsonResponse({ new: true }));

    const error = await upsertGhlContact(input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(GhlError);
  });
});
