import type { ErrorResponse } from "resend";
import { describe, expect, it } from "vitest";

import { isPermanentSendError } from "@/lib/clients/resend-error";

function resendError(statusCode: number | null): ErrorResponse {
  return { name: "application_error", message: "boom", statusCode };
}

describe("isPermanentSendError", () => {
  it.each([
    400, 401, 403, 404, 405, 422, 451,
  ])("treats %i as permanent — retrying won't fix a bad key, domain, or payload", (status) => {
    expect(isPermanentSendError(resendError(status))).toBe(true);
  });

  it.each([
    408, 409, 429, 500, 502, 503,
  ])("treats %i as transient so the task retries instead of dropping the email", (status) => {
    expect(isPermanentSendError(resendError(status))).toBe(false);
  });

  it("treats an unknown status as transient — never drop on ambiguity", () => {
    expect(isPermanentSendError(resendError(null))).toBe(false);
  });
});
