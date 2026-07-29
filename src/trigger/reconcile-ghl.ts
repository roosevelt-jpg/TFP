import { logger, schedules } from "@trigger.dev/sdk";

import { findMembersToReconcile } from "@/data/payments/queries/find-members-to-reconcile";
import {
  addGhlTags,
  GhlError,
  getGhlContactTags,
  upsertGhlContact,
} from "@/lib/clients/ghl";
import { findDrift } from "@/lib/ghl/drift";
import { env } from "@/env";

import { ghlQueue } from "./queues";

// Every member we look at in one run. Well above any realistic membership at
// launch, and a ceiling means a runaway can't burn the GHL rate limit.
const BATCH = 500;

export const reconcileGhl = schedules.task({
  id: "reconcile-ghl",
  // 03:15 UTC: after the day's purchases have settled, before anyone is
  // working. Odd minute so it doesn't contend with every other cron on the
  // hour.
  cron: {
    pattern: "15 3 * * *",
    environments: ["PRODUCTION"],
  },
  queue: ghlQueue,
  machine: "micro",
  // A run that hasn't started within the hour is stale; the next one covers the
  // same ground anyway, so expiring beats stacking duplicates.
  ttl: "1h",
  maxDuration: 600,
  run: async () => {
    if (!env.GHL_SYNC_ENABLED) {
      logger.warn("Reconcile skipped: GHL sync is disabled");
      return { skipped: true };
    }

    const members = await findMembersToReconcile(BATCH);
    const repaired: string[] = [];
    const suspect: { purchaseRef: string; tags: string[] }[] = [];
    let exempt = 0;
    let failed = 0;

    for (const member of members) {
      try {
        // Upsert rather than search: it resolves the contact by email or phone
        // the same way the sync does, so both agree on which contact is theirs.
        const { contactId } = await upsertGhlContact({
          name: member.name,
          email: member.email,
          phone: member.whatsapp,
        });

        const drift = findDrift({
          tags: await getGhlContactTags(contactId),
          entitled: member.entitled,
        });

        if (drift.exempt) {
          exempt++;
          continue;
        }

        if (drift.add.length > 0) {
          await addGhlTags(contactId, drift.add);
          repaired.push(member.purchaseRef);

          logger.warn("Restored tags a paying member was missing", {
            purchaseRef: member.purchaseRef,
            contactId,
            added: drift.add,
            // A member who never synced points at a dropped enqueue; one that
            // synced and drifted anyway points at something else editing tags.
            syncedAt: member.syncedAt,
          });
        }

        if (drift.suspect.length > 0) {
          suspect.push({
            purchaseRef: member.purchaseRef,
            tags: drift.suspect,
          });
        }
      } catch (error) {
        // One unreachable contact must not stop the sweep: the rest of the
        // membership still needs checking, and the next run retries this one.
        failed++;
        logger.error("Could not reconcile a member", {
          purchaseRef: member.purchaseRef,
          error: error instanceof GhlError ? error.message : error,
        });
      }
    }

    // Tags we believe are wrong but will not remove. Someone reads these.
    if (suspect.length > 0) {
      logger.error("Members holding tags they should not", { suspect });
    }

    const summary = {
      checked: members.length,
      repaired: repaired.length,
      suspect: suspect.length,
      exempt,
      failed,
    };

    logger.info("GHL reconcile finished", summary);

    // The dead-man's switch. Only pinged on a clean finish, so a run that
    // throws or never starts stops the heartbeat and alerts.
    await pingHeartbeat();

    return summary;
  },
  onFailure: async ({ error }) => {
    logger.error("GHL reconcile failed; drift went unrepaired tonight", {
      error,
    });
  },
});

// Absence of this ping is the alert. Its own failure must not fail the run,
// which did its job regardless.
async function pingHeartbeat(): Promise<void> {
  if (!env.RECONCILE_HEARTBEAT_URL) return;

  try {
    await fetch(env.RECONCILE_HEARTBEAT_URL, {
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    logger.warn("Reconcile heartbeat ping failed", { error });
  }
}
