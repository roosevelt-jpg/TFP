import "server-only";

import { Resend } from "resend";

import { resolveSecret } from "@/lib/secrets/store";

/** Lazy client — never throw at import time (Team page must load without Resend). */
let cached: Resend | null = null;
let cachedKey: string | null = null;

export async function getResend(): Promise<Resend> {
  const key =
    (await resolveSecret("RESEND_API_KEY")) ?? process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it under Integrations or .env.local.",
    );
  }
  if (!cached || cachedKey !== key) {
    cached = new Resend(key);
    cachedKey = key;
  }
  return cached;
}

/** Compatible with existing `resend.emails.send(...)` call sites. */
export const resend = {
  get emails() {
    return {
      send: async (
        ...args: Parameters<Resend["emails"]["send"]>
      ): ReturnType<Resend["emails"]["send"]> => {
        const client = await getResend();
        return client.emails.send(...args);
      },
    };
  },
};
