// Pre-send scrub for the two PII shapes specific to this app that match exactly
// (no false positives): E.164 phones (always `+`-prefixed via toE164) and the
// /joined?id= confirmation token. Pattern PII (emails, IPs) is left to Sentry's
// server-side Data Scrubbing (@email / @ip), which is more robust than a regex.
const PHONE = /\+\d[\d\s().-]{6,}\d/g;
const TOKEN_PARAM = /([?&](?:id|token)=)[^&\s]+/gi;

export function scrubString(value: string): string {
  return value.replace(PHONE, "[phone]").replace(TOKEN_PARAM, "$1[redacted]");
}

export function scrubDeep(value: unknown, depth = 0): unknown {
  if (depth > 8) return value;
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) {
    return value.map((item) => scrubDeep(item, depth + 1));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = scrubDeep(item, depth + 1);
    }
    return out;
  }
  return value;
}

type ScrubbableEvent = {
  message?: string;
  exception?: { values?: ({ value?: string } | undefined)[] | undefined };
  request?: { url?: string; query_string?: unknown };
  breadcrumbs?: ({ message?: string; data?: unknown } | undefined)[];
  extra?: Record<string, unknown>;
};

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.message) event.message = scrubString(event.message);

  for (const ex of event.exception?.values ?? []) {
    if (ex?.value) ex.value = scrubString(ex.value);
  }

  if (event.request?.url) event.request.url = scrubString(event.request.url);
  if (event.request?.query_string !== undefined) {
    event.request.query_string = scrubDeep(event.request.query_string);
  }

  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb?.message) crumb.message = scrubString(crumb.message);
    if (crumb?.data) crumb.data = scrubDeep(crumb.data);
  }

  if (event.extra)
    event.extra = scrubDeep(event.extra) as Record<string, unknown>;

  return event;
}

type ScrubbableLog = { body?: string; attributes?: Record<string, unknown> };

export function scrubLog<T extends ScrubbableLog>(log: T): T {
  if (log.body) log.body = scrubString(log.body);
  if (log.attributes) {
    log.attributes = scrubDeep(log.attributes) as Record<string, unknown>;
  }
  return log;
}
