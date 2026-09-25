import { schemaTask, schedules } from "@trigger.dev/sdk";
import * as z from "zod";

import {
  pullMetaAdInsights,
  pullShopifyInventory,
  pullShopifyOrders,
  pullShopifySubscriptionContracts,
  pullStripeMoney,
} from "@/lib/connectors/pulls";
import { pullGhlLeadThreads, pullKlaviyoCampaigns } from "@/lib/connectors/ghl-klaviyo";
import { pullN8nStatus, runUptimeChecks } from "@/lib/connectors/uptime-n8n";
import { pullRevolutBalances } from "@/lib/connectors/revolut";
import { triageGmailInbox } from "@/lib/connectors/gmail";
import { pullCalendlyEvents } from "@/lib/connectors/calendly";
import { rebuildDailySnapshot } from "@/lib/metrics/economics";
import { pullPublishedPostMetrics } from "@/lib/content/metrics-pull";

export const pullShopifyTask = schemaTask({
  id: "command.pull-shopify",
  schema: z.object({}),
  run: async () => {
    const result = await pullShopifyOrders();
    await rebuildDailySnapshot();
    return result;
  },
});

/** Manual inventory-only pull (also runs inside pullShopifyOrders). */
export const pullShopifyInventoryTask = schemaTask({
  id: "command.pull-shopify-inventory",
  schema: z.object({}),
  run: async () => pullShopifyInventory(),
});

/** Manual READ-ONLY subscription contract mirror. */
export const pullShopifySubscriptionsTask = schemaTask({
  id: "command.pull-shopify-subscriptions",
  schema: z.object({}),
  run: async () => pullShopifySubscriptionContracts(),
});

export const pullMetaTask = schemaTask({
  id: "command.pull-meta",
  schema: z.object({}),
  run: async () => pullMetaAdInsights(),
});

export const pullStripeTask = schemaTask({
  id: "command.pull-stripe",
  schema: z.object({}),
  run: async () => pullStripeMoney(),
});

export const shopifySchedule = schedules.task({
  id: "command.shopify-schedule",
  cron: { pattern: "*/15 * * * *", environments: ["PRODUCTION"] },
  run: async () => {
    await pullShopifyOrders();
    await rebuildDailySnapshot();
  },
});

export const metaSchedule = schedules.task({
  id: "command.meta-schedule",
  cron: { pattern: "5 * * * *", environments: ["PRODUCTION"] },
  run: async () => pullMetaAdInsights(),
});

export const stripeSchedule = schedules.task({
  id: "command.stripe-schedule",
  cron: { pattern: "10 * * * *", environments: ["PRODUCTION"] },
  run: async () => pullStripeMoney(),
});

export const ghlSchedule = schedules.task({
  id: "command.ghl-schedule",
  cron: { pattern: "*/15 * * * *", environments: ["PRODUCTION"] },
  run: async () => pullGhlLeadThreads(),
});

export const klaviyoSchedule = schedules.task({
  id: "command.klaviyo-schedule",
  cron: { pattern: "20 * * * *", environments: ["PRODUCTION"] },
  run: async () => pullKlaviyoCampaigns(),
});

export const uptimeSchedule = schedules.task({
  id: "command.uptime-schedule",
  cron: { pattern: "*/5 * * * *", environments: ["PRODUCTION"] },
  run: async () => {
    await runUptimeChecks();
    await pullN8nStatus();
  },
});

export const gmailSchedule = schedules.task({
  id: "command.gmail-schedule",
  cron: { pattern: "*/5 * * * *", environments: ["PRODUCTION"] },
  run: async () => triageGmailInbox(),
});

export const revolutSchedule = schedules.task({
  id: "command.revolut-schedule",
  cron: { pattern: "15 */6 * * *", environments: ["PRODUCTION"] },
  run: async () => pullRevolutBalances(),
});

export const calendlySchedule = schedules.task({
  id: "command.calendly-schedule",
  cron: { pattern: "*/15 * * * *", environments: ["PRODUCTION"] },
  run: async () => pullCalendlyEvents(),
});

export const pullCalendlyTask = schemaTask({
  id: "command.pull-calendly",
  schema: z.object({}),
  run: async () => pullCalendlyEvents(),
});

/** Daily post metrics — IG insights when possible, else placeholder zeros. */
export const pullPostMetricsTask = schemaTask({
  id: "command.pull-post-metrics",
  schema: z.object({}),
  run: async () => pullPublishedPostMetrics(),
});

export const postMetricsSchedule = schedules.task({
  id: "command.post-metrics-daily",
  cron: { pattern: "45 4 * * *", environments: ["PRODUCTION"] },
  run: async () => pullPublishedPostMetrics(),
});
