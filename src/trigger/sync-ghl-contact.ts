import { AbortTaskRunError, logger, schemaTask, wait } from "@trigger.dev/sdk";
import { z } from "zod";

import { GhlError, upsertGhlContact } from "@/lib/clients/ghl";
import { toGhlCustomFields } from "@/lib/ghl/fields";
import {
  GOAL_VALUES,
  LEVEL_VALUES,
  SEX_VALUES,
} from "@/lib/validation/waitlist/options";

import { ghlQueue } from "./queues";

const CONTACT_SOURCE = "Waitlist Website";
const WAITLIST_TAG = "waitlist";

export const syncGhlContact = schemaTask({
  id: "sync-ghl-contact",
  schema: z.object({
    name: z.string(),
    email: z.email(),
    phone: z.string(),
    ref: z.string(),
    goal: z.enum(GOAL_VALUES),
    level: z.enum(LEVEL_VALUES),
    sex: z.enum(SEX_VALUES),
    age: z.number(),
    heightCm: z.number(),
    weightKg: z.number(),
    goalWeightKg: z.number().nullish(),
    diet: z.string().nullish(),
    injuries: z.string().nullish(),
  }),
  queue: ghlQueue,
  // randomize so a burst of failed syncs doesn't retry in lockstep.
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 30,
  run: async (payload) => {
    const { name, email, phone, ref } = payload;

    try {
      const result = await upsertGhlContact({
        name,
        email,
        phone,
        source: CONTACT_SOURCE,
        tags: [WAITLIST_TAG],
        customFields: toGhlCustomFields(payload),
      });

      logger.info("GHL contact synced", {
        ref,
        contactId: result.contactId,
        isNew: result.isNew,
      });

      return result;
    } catch (error) {
      if (error instanceof GhlError) {
        // Bad payload/auth won't change on retry — stop rather than burn attempts.
        if (error.permanent) {
          throw new AbortTaskRunError(error.message);
        }
        if (error.status === 429 && error.retryAfterMs) {
          logger.warn("GHL rate-limited, waiting before retry", {
            ref,
            retryAfterMs: error.retryAfterMs,
          });
          await wait.for({ seconds: Math.ceil(error.retryAfterMs / 1000) });
        }
      }
      throw error;
    }
  },
  onFailure: async ({ payload, error }) => {
    // The DB row survives an unreachable GHL, so a failed sync is re-drivable by ref.
    logger.error("GHL contact sync permanently failed", {
      ref: payload.ref,
      email: payload.email,
      error,
    });
  },
});
