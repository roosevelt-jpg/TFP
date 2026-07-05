import "server-only";

import { env } from "@/env";

const BASE_URL = "https://services.leadconnectorhq.com";
const API_VERSION = "2021-07-28";

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
  // true when GHL created a new contact, false when it matched and updated one.
  isNew: boolean;
  contactId: string;
};

type UpsertResponse = {
  new?: boolean;
  contact?: { id?: string };
};

// Thrown on a non-2xx GHL response. `permanent` distinguishes errors that will
// never succeed on retry (bad payload / auth — 400/401/403/422) from transient
// ones (429 rate limit, 5xx outage) that a retry can recover — so the caller
// retries the transient ones and aborts the permanent ones (no lost lead to a
// blip, no wasted retries on bad data). `retryAfterMs` carries GHL's Retry-After.
export class GhlError extends Error {
  readonly status: number;
  readonly permanent: boolean;
  readonly retryAfterMs?: number;

  constructor(status: number, body: string, retryAfterMs?: number) {
    super(`GHL request failed (${status}): ${body.slice(0, 300)}`);
    this.name = "GhlError";
    this.status = status;
    // 429 (rate limit) and 5xx (server) are transient; other 4xx are permanent.
    this.permanent = status !== 429 && status >= 400 && status < 500;
    this.retryAfterMs = retryAfterMs;
  }
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds * 1000 : undefined;
}

// Upsert a contact in GoHighLevel. Matches an existing contact by email/phone
// per the location's "Allow Duplicate Contact" setting, so re-submits update
// rather than duplicate. Throws GhlError on a non-2xx.
export async function upsertGhlContact(
  input: UpsertContactInput,
): Promise<UpsertContactResult> {
  const res = await fetch(`${BASE_URL}/contacts/upsert`, {
    method: "POST",
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

  return {
    isNew: data.new === true,
    contactId: data.contact?.id ?? "",
  };
}
