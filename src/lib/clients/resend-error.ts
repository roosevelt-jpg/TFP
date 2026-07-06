import type { ErrorResponse } from "resend";

// A 4xx won't change on retry (bad payload, key, or domain) except the
// contention statuses; 5xx, network, and unknown-status errors are transient.
// Same rule as GhlError.permanent. Resend returns errors as values, so send
// callers must route this to abort-vs-retry themselves.
const TRANSIENT_STATUSES = new Set([408, 409, 423, 429]);

export function isPermanentSendError(error: ErrorResponse): boolean {
  const status = error.statusCode;
  if (!status) return false;
  return status >= 400 && status < 500 && !TRANSIENT_STATUSES.has(status);
}
