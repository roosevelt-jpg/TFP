import "server-only";

import { connection } from "next/server";

/** Request-time clock — required before `new Date()` under Cache Components. */
export async function requestNow() {
  await connection();
  return new Date();
}

export function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
