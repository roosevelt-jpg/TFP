import "server-only";

import { resolveSecret } from "@/lib/secrets/store";

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

async function ghlAuth() {
  const token = await resolveSecret("GHL_INTEGRATION_TOKEN");
  const locationId = await resolveSecret("GHL_LOCATION_ID");
  if (!token || !locationId) {
    throw new Error("GHL_INTEGRATION_TOKEN / GHL_LOCATION_ID not configured");
  }
  return { token, locationId };
}

// Upsert matches by email/phone per the location's "Allow Duplicate Contact"
// setting, so re-submits update rather than duplicate.
export async function upsertGhlContact(
  input: UpsertContactInput,
): Promise<UpsertContactResult> {
  const { token, locationId } = await ghlAuth();
  const res = await fetch(`${BASE_URL}/contacts/upsert`, {
    method: "POST",
    // A hung socket won't trip Trigger's maxDuration (CPU time), so bound it here.
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${token}`,
      Version: API_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      locationId,
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

async function ghlFetch(
  path: string,
  init: { method: string; body?: unknown },
): Promise<Response> {
  const { token } = await ghlAuth();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${token}`,
      Version: API_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });

  if (!res.ok) {
    throw new GhlError(
      res.status,
      await res.text(),
      parseRetryAfter(res.headers.get("retry-after")),
    );
  }

  return res;
}

// Tags are addressed by name, not id, and both calls are idempotent: adding a
// tag the contact already has, or removing one it doesn't, is a no-op 2xx.
export async function addGhlTags(
  contactId: string,
  tags: string[],
): Promise<void> {
  if (tags.length === 0) return;
  await ghlFetch(`/contacts/${contactId}/tags`, {
    method: "POST",
    body: { tags },
  });
}

export async function removeGhlTags(
  contactId: string,
  tags: string[],
): Promise<void> {
  if (tags.length === 0) return;
  await ghlFetch(`/contacts/${contactId}/tags`, {
    method: "DELETE",
    body: { tags },
  });
}

// Needed to decide the welcome tag: whether someone has opted into WhatsApp
// lives only in the CRM, so it has to be read rather than inferred from Stripe.
export async function getGhlContactTags(contactId: string): Promise<string[]> {
  const res = await ghlFetch(`/contacts/${contactId}`, { method: "GET" });
  const data = (await res.json()) as { contact?: { tags?: string[] } };
  return data.contact?.tags ?? [];
}
