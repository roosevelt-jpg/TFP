export const ERROR_CODES = {
  DUPLICATE_EMAIL: "DUPLICATE_EMAIL",
  RATE_LIMITED: "RATE_LIMITED",
  REJECTED: "REJECTED",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
