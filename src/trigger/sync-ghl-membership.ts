import { AbortTaskRunError, logger, schemaTask, wait } from "@trigger.dev/sdk";
import { z } from "zod";

import {
  addGhlTags,
  GhlError,
  removeGhlTags,
  upsertGhlContact,
} from "@/lib/clients/ghl";
import {
  intakeFields,
  purchaseFields,
  statusField,
  whatsAppOptInFields,
} from "@/lib/ghl/membership-fields";
import {
  INTAKE_COMPLETE_TAGS_TO_REMOVE,
  PURCHASE_TAGS,
  PURCHASE_TAGS_TO_ADD,
  PURCHASE_TAGS_TO_REMOVE,
  tagsForStatus,
} from "@/lib/ghl/membership-tags";
import { db } from "@/db";
import { SubscriptionStatus } from "@/generated/prisma/enums";

import { ghlQueue } from "./queues";

const CONTACT_SOURCE = "Programme Checkout";

// One task for both shapes, because both end in the same place: a contact whose
// tags match what the customer is currently entitled to.
//
//   purchase   creates or finds the contact, writes the membership fields, and
//              records the WhatsApp consent taken at checkout
//   lifecycle  flips access as billing state changes
const purchaseSchema = z.object({
  kind: z.literal("purchase"),
  purchaseRef: z.string(),
  name: z.string(),
  email: z.email(),
  phone: z.string(),
  stripeCustomerId: z.string(),
  purchasedAt: z.coerce.date(),
  consentAt: z.coerce.date(),
  coaching: z
    .object({
      goal: z.string().nullish(),
      level: z.string().nullish(),
      sex: z.string().nullish(),
      age: z.number().nullish(),
      heightCm: z.number().nullish(),
      weightKg: z.number().nullish(),
      goalWeightKg: z.number().nullish(),
      diet: z.string().nullish(),
      injuries: z.string().nullish(),
    })
    .nullish(),
});

const lifecycleSchema = z.object({
  kind: z.literal("lifecycle"),
  email: z.email(),
  phone: z.string(),
  name: z.string(),
  status: z.enum(SubscriptionStatus),
  stripeSubscriptionId: z.string(),
});

type PurchasePayload = z.infer<typeof purchaseSchema>;
type LifecyclePayload = z.infer<typeof lifecycleSchema>;

export const syncGhlMembership = schemaTask({
  id: "sync-ghl-membership",
  schema: z.discriminatedUnion("kind", [purchaseSchema, lifecycleSchema]),
  queue: ghlQueue,
  // Four HTTP calls and no computation, so the smallest machine is right.
  machine: "micro",
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
    randomize: true,
  },
  // CPU time per attempt, which excludes wait.for, so this only has to cover
  // the four HTTP calls a sync makes at a 15s client timeout each. Exceeding it
  // skips onFailure, and that hook is the only record a sync was lost.
  maxDuration: 90,
  run: async (payload) => {
    try {
      return payload.kind === "purchase"
        ? await syncPurchase(payload)
        : await syncLifecycle(payload);
    } catch (error) {
      if (error instanceof GhlError) {
        if (error.permanent) throw new AbortTaskRunError(error.message);
        if (error.status === 429 && error.retryAfterMs) {
          await wait.for({ seconds: Math.ceil(error.retryAfterMs / 1000) });
        }
      }
      throw error;
    }
  },
  // The correlation keys the runbook searches on. A contact whose tags are
  // wrong is traced from here to the Stripe event that set them.
  onSuccess: async ({ payload, output }) => {
    logger.info("GHL membership sync applied", {
      kind: payload.kind,
      contactId: output.contactId,
      ...(payload.kind === "purchase"
        ? { purchaseRef: payload.purchaseRef }
        : { stripeSubscriptionId: payload.stripeSubscriptionId }),
    });
  },
  // Reached only after every retry, so this is the last chance to record that a
  // member's access may not match what they are paying for. Reconcile repairs
  // it nightly; this is what tells anyone it happened.
  onFailure: async ({ payload, error }) => {
    logger.error("GHL membership sync permanently failed", {
      kind: payload.kind,
      email: payload.email,
      error,
    });
  },
});

async function syncPurchase(
  payload: PurchasePayload,
): Promise<{ contactId: string | null }> {
  const { contactId, isNew } = await upsertGhlContact({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    source: CONTACT_SOURCE,
    tags: PURCHASE_TAGS,
    customFields: [
      ...purchaseFields({
        stripeCustomerId: payload.stripeCustomerId,
        purchasedAt: payload.purchasedAt,
      }),
      ...whatsAppOptInFields(payload.consentAt),
      ...(payload.coaching ? intakeFields(payload.coaching) : []),
    ],
  });

  // Tagged after the fields land, or their T1 template renders a half-written
  // contact.
  await addGhlTags(contactId, PURCHASE_TAGS_TO_ADD);
  await removeGhlTags(contactId, [
    ...PURCHASE_TAGS_TO_REMOVE,
    ...(payload.coaching ? INTAKE_COMPLETE_TAGS_TO_REMOVE : []),
  ]);

  // Written after the fact, not claimed before: re-tagging a contact is
  // harmless, so this records the last success rather than locking the work.
  // Reconcile reads it to find purchases whose tags never landed.
  await db.purchase.updateMany({
    where: { ref: payload.purchaseRef },
    data: { ghlSyncedAt: new Date() },
  });

  logger.info("GHL membership granted", {
    purchaseRef: payload.purchaseRef,
    contactId,
    isNew,
  });

  return { contactId };
}

async function syncLifecycle(
  payload: LifecyclePayload,
): Promise<{ contactId: string | null }> {
  const transition = tagsForStatus(payload.status);

  // A first payment that never landed grants nothing, so there is nothing to
  // revoke either.
  if (!transition) {
    logger.info("Subscription status needs no GHL change", {
      stripeSubscriptionId: payload.stripeSubscriptionId,
      status: payload.status,
    });
    return { contactId: null };
  }

  const { contactId } = await upsertGhlContact({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    customFields: [statusField(transition.subscriptionStatus)],
  });

  await addGhlTags(contactId, transition.add);
  await removeGhlTags(contactId, transition.remove);

  logger.info("GHL membership state synced", {
    stripeSubscriptionId: payload.stripeSubscriptionId,
    contactId,
    status: payload.status,
    added: transition.add,
    removed: transition.remove,
  });

  return { contactId };
}
