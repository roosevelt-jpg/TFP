import "server-only";

import { env } from "@/env";

const BASE_URL = "https://services.leadconnectorhq.com";
const API_VERSION = "2021-07-28";
const REQUEST_TIMEOUT_MS = 15000;
const TRANSIENT_4XX = new Set([408, 409, 423, 429]);

export type GhlCustomField = { id: string; field_value: string };

type UpsertContactInput = {
  name: string;
  email: string;
  phone: string;
  source?: string;
  tags?: string[];
  customFields?: GhlCustomField[];
};

type UpsertContactResult = {
  isNew: boolean;
  contactId: string;
};

type UpsertResponse = {
  new?: boolean;
  contact?: { id?: string };
};

// `permanent` lets the caller abort on a 4xx that won't change on retry while
// retrying transient errors — so a blip never drops a lead. Network errors
// throw before a response and so are never a GhlError (treated as transient).
export class GhlError extends Error {
  readonly status: number;
  readonly permanent: boolean;
  readonly retryAfterMs?: number;

  constructor(status: number, body: string, retryAfterMs?: number) {
    super(`GHL request failed (${status}): ${body.slice(0, 300)}`);
    this.name = "GhlError";
    this.status = status;
    this.permanent =
      status >= 400 && status < 500 && !TRANSIENT_4XX.has(status);
    this.retryAfterMs = retryAfterMs;
  }
}

// Retry-After is either delta-seconds or an HTTP-date.
function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const dateMs = Date.parse(header);
  if (Number.isNaN(dateMs)) return undefined;
  return Math.max(0, dateMs - Date.now());
}

// Upsert matches by email/phone per the location's "Allow Duplicate Contact"
// setting, so re-submits update rather than duplicate.
export async function upsertGhlContact(
  input: UpsertContactInput,
): Promise<UpsertContactResult> {
  const res = await fetch(`${BASE_URL}/contacts/upsert`, {
    method: "POST",
    // A hung socket won't trip Trigger's maxDuration (CPU time), so bound it here.
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${env.GHL_INTEGRATION_TOKEN}`,
      Version: API_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      locationId: env.GHL_LOCATION_ID,
      name: input.name,
      email: input.email,
      phone: input.phone,
      ...(input.source ? { source: input.source } : {}),
      ...(input.tags ? { tags: input.tags } : {}),
      ...(input.customFields ? { customFields: input.customFields } : {}),
    }),
  });

  if (!res.ok) {
    throw new GhlError(
      res.status,
      await res.text(),
      parseRetryAfter(res.headers.get("retry-after")),
    );
  }

  const data = (await res.json()) as UpsertResponse;
  const contactId = data.contact?.id;

  if (!contactId) {
    throw new Error("GHL upsert returned 2xx without a contact id");
  }

  return { isNew: data.new === true, contactId };
}
