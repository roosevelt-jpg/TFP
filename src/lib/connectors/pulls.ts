import "server-only";

import { db } from "@/db";
import { resolvePersonCustomer } from "@/lib/identity/resolve";
import { resolveSecret } from "@/lib/secrets/store";

async function markRun(
  sourceId: string,
  ok: boolean,
  errorOrNote?: string,
) {
  await db.connectorRun.update({
    where: { sourceId },
    data: {
      lastRunAt: new Date(),
      lastSuccessAt: ok ? new Date() : undefined,
      lastError: ok ? null : errorOrNote,
      status: ok ? "healthy" : "error",
      ...(ok && errorOrNote ? { scheduleNote: errorOrNote.slice(0, 500) } : {}),
    },
  });
}

type ShopifyMoney = { shopMoney: { amount: string; currencyCode?: string } };

type ShopifyLineNode = {
  sku?: string | null;
  title: string;
  quantity: number;
  discountedTotalSet: ShopifyMoney;
  sellingPlan?: { name?: string | null } | null;
  variant?: {
    sku?: string | null;
    title?: string | null;
    inventoryItem?: {
      unitCost?: { amount?: string | null; currencyCode?: string } | null;
    } | null;
  } | null;
};

type ShopifyFulfillment = {
  status?: string | null;
  createdAt?: string | null;
  deliveredAt?: string | null;
  inTransitAt?: string | null;
  trackingInfo?: Array<{
    company?: string | null;
    number?: string | null;
  }> | null;
  fulfillmentLineItems?: {
    edges: Array<{
      node: {
        quantity: number;
        lineItem?: { sku?: string | null; title?: string | null } | null;
      };
    }>;
  } | null;
};

type ShopifyOrderNode = {
  id: string;
  name: string;
  createdAt: string;
  displayFulfillmentStatus?: string | null;
  totalPriceSet: ShopifyMoney;
  totalDiscountsSet: ShopifyMoney;
  shippingAddress?: { countryCodeV2?: string | null } | null;
  customer?: {
    email?: string | null;
    phone?: string | null;
    displayName?: string | null;
    numberOfOrders?: number | null;
  } | null;
  lineItems: { edges: Array<{ node: ShopifyLineNode }> };
  fulfillments?: ShopifyFulfillment[] | null;
};

type GqlError = { message?: string; extensions?: { code?: string } };

async function shopifyGraphql<T>(
  shop: string,
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<{ data?: T; errors?: GqlError[]; httpOk: boolean; httpText?: string }> {
  const res = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    return { httpOk: false, httpText: (await res.text()).slice(0, 500) };
  }
  const json = (await res.json()) as { data?: T; errors?: GqlError[] };
  return { data: json.data, errors: json.errors, httpOk: true };
}

function penceFromAmount(amount: string | number | null | undefined): number {
  return Math.round(Number(amount ?? 0) * 100);
}

function gqlScopeDenied(errors?: GqlError[]): boolean {
  if (!errors?.length) return false;
  return errors.some((e) => {
    const msg = (e.message ?? "").toLowerCase();
    const code = (e.extensions?.code ?? "").toUpperCase();
    return (
      code === "ACCESS_DENIED" ||
      msg.includes("access denied") ||
      msg.includes("access_denied") ||
      msg.includes("not approved") ||
      msg.includes("permission") ||
      msg.includes("scope")
    );
  });
}

function lineUnitCostPence(li: ShopifyLineNode): number | null {
  const amount = li.variant?.inventoryItem?.unitCost?.amount;
  if (amount == null || amount === "") return null;
  const n = Number(amount);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 3_600_000;
}

/** Shopify Admin GraphQL pull — read-only orders + best-effort depth into warehouse. */
export async function pullShopifyOrders() {
  const shop = await resolveSecret("SHOPIFY_SHOP_DOMAIN");
  const token = await resolveSecret("SHOPIFY_ADMIN_TOKEN");
  if (!shop || !token) {
    await markRun("S1", false, "SHOPIFY_* credentials not configured");
    return { skipped: true as const };
  }

  const notes: string[] = [];

  const query = `
    query ($cursor: String) {
      orders(first: 50, after: $cursor, sortKey: CREATED_AT, reverse: true) {
        edges {
          cursor
          node {
            id
            name
            createdAt
            displayFinancialStatus
            displayFulfillmentStatus
            totalPriceSet { shopMoney { amount currencyCode } }
            totalDiscountsSet { shopMoney { amount } }
            shippingAddress { countryCodeV2 }
            customer { email phone displayName numberOfOrders }
            lineItems(first: 50) {
              edges {
                node {
                  sku
                  title
                  quantity
                  discountedTotalSet { shopMoney { amount } }
                  sellingPlan { name }
                  variant {
                    sku
                    title
                    inventoryItem { unitCost { amount currencyCode } }
                  }
                }
              }
            }
            fulfillments {
              status
              createdAt
              deliveredAt
              inTransitAt
              trackingInfo { company number }
              fulfillmentLineItems(first: 50) {
                edges {
                  node {
                    quantity
                    lineItem { sku title }
                  }
                }
              }
            }
          }
        }
        pageInfo { hasNextPage }
      }
    }
  `;

  const result = await shopifyGraphql<{
    orders: {
      edges: Array<{ node: ShopifyOrderNode }>;
      pageInfo: { hasNextPage: boolean };
    };
  }>(shop, token, query);

  if (!result.httpOk) {
    await markRun("S1", false, result.httpText);
    throw new Error(`Shopify pull failed: HTTP`);
  }

  // Deep fields (fulfillments / unitCost / sellingPlan) may 403 on scopes —
  // fall back to a minimal orders query so S1 still lands.
  let edges = result.data?.orders.edges ?? [];
  if ((!result.data?.orders || result.errors?.length) && gqlScopeDenied(result.errors)) {
    notes.push(
      `orders deep fields skipped: ${(result.errors ?? []).map((e) => e.message).join("; ").slice(0, 200)}`,
    );
    const fallback = await shopifyGraphql<{
      orders: { edges: Array<{ node: ShopifyOrderNode }> };
    }>(
      shop,
      token,
      `
      query {
        orders(first: 50, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              name
              createdAt
              totalPriceSet { shopMoney { amount currencyCode } }
              totalDiscountsSet { shopMoney { amount } }
              customer { email phone displayName numberOfOrders }
              lineItems(first: 50) {
                edges {
                  node {
                    sku
                    title
                    quantity
                    discountedTotalSet { shopMoney { amount } }
                  }
                }
              }
            }
          }
        }
      }
      `,
    );
    if (!fallback.httpOk || !fallback.data?.orders) {
      await markRun(
        "S1",
        false,
        fallback.httpText ??
          (fallback.errors ?? []).map((e) => e.message).join("; ").slice(0, 500),
      );
      throw new Error("Shopify pull failed after scope fallback");
    }
    edges = fallback.data.orders.edges;
  } else if (result.errors?.length && !result.data?.orders) {
    await markRun(
      "S1",
      false,
      result.errors.map((e) => e.message).join("; ").slice(0, 500),
    );
    throw new Error("Shopify GraphQL errors");
  } else if (result.errors?.length) {
    notes.push(
      `orders partial: ${result.errors.map((e) => e.message).join("; ").slice(0, 200)}`,
    );
  }

  let upserts = 0;
  let fulfilments = 0;
  let cogsLines = 0;

  for (const edge of edges) {
    const node = edge.node;
    const email = node.customer?.email?.toLowerCase() ?? undefined;
    let personId: string | undefined;
    if (email || node.customer?.phone) {
      const person = await resolvePersonCustomer({
        email,
        phone: node.customer?.phone ?? undefined,
        name: node.customer?.displayName ?? undefined,
        shopifyId: node.id,
      });
      personId = person.id;
    }

    const netPence = penceFromAmount(node.totalPriceSet.shopMoney.amount);
    const discountPence = penceFromAmount(node.totalDiscountsSet.shopMoney.amount);
    const paidAt = new Date(node.createdAt);

    const lineRows = node.lineItems.edges.map((li) => {
      const unitCost = lineUnitCostPence(li.node);
      const cogs =
        unitCost != null ? unitCost * li.node.quantity : 0;
      if (unitCost != null) cogsLines += 1;
      return {
        sku: li.node.sku || li.node.variant?.sku || li.node.title,
        title: li.node.title,
        quantity: li.node.quantity,
        netPence: penceFromAmount(li.node.discountedTotalSet.shopMoney.amount),
        cogsPence: cogs,
      };
    });
    const orderCogs = lineRows.reduce((s, l) => s + l.cogsPence, 0);
    const isSubscription = node.lineItems.edges.some(
      (li) => Boolean(li.node.sellingPlan?.name),
    );
    const isStack = node.lineItems.edges.some((li) =>
      /stack/i.test(li.node.title),
    );
    const isNewCustomer =
      node.customer?.numberOfOrders != null
        ? node.customer.numberOfOrders <= 1
        : false;

    const order = await db.warehouseOrder.upsert({
      where: { shopifyOrderId: node.id },
      create: {
        shopifyOrderId: node.id,
        orderName: node.name,
        personId,
        grossPence: netPence + discountPence,
        discountPence,
        netPence,
        cogsPence: orderCogs,
        paidAt,
        isSubscription,
        isStack,
        isNewCustomer,
        label: "verified",
        sourceFreshAt: new Date(),
      },
      update: {
        orderName: node.name,
        netPence,
        discountPence,
        grossPence: netPence + discountPence,
        cogsPence: orderCogs,
        personId,
        isSubscription,
        isStack,
        isNewCustomer,
        sourceFreshAt: new Date(),
      },
    });

    await db.orderLine.deleteMany({ where: { orderId: order.id } });
    if (lineRows.length) {
      await db.orderLine.createMany({
        data: lineRows.map((l) => ({ ...l, orderId: order.id })),
      });
    }

    const fulfillments = node.fulfillments ?? [];
    const orderedQty = lineRows.reduce((s, l) => s + l.quantity, 0);
    const fulfilledQty = fulfillments.reduce((s, f) => {
      const fl = f.fulfillmentLineItems?.edges ?? [];
      return s + fl.reduce((a, e) => a + (e.node.quantity ?? 0), 0);
    }, 0);
    const shipped =
      fulfillments.find(
        (f) =>
          f.status === "SUCCESS" ||
          f.deliveredAt ||
          f.inTransitAt ||
          f.createdAt,
      ) ?? fulfillments[0];
    const fulfilledAt = shipped
      ? new Date(
          shipped.deliveredAt ??
            shipped.inTransitAt ??
            shipped.createdAt ??
            node.createdAt,
        )
      : null;
    const trackingComplete =
      fulfillments.length > 0 &&
      fulfillments.every((f) =>
        (f.trackingInfo ?? []).some((t) => Boolean(t.number)),
      );
    const missingTracking = fulfillments.filter(
      (f) => !(f.trackingInfo ?? []).some((t) => Boolean(t.number)),
    ).length;
    const componentGaps =
      Math.max(0, orderedQty - fulfilledQty) + missingTracking;
    const carrier =
      shipped?.trackingInfo?.find((t) => t.company)?.company ?? null;
    const region =
      node.shippingAddress?.countryCodeV2 === "GB" ||
      node.shippingAddress?.countryCodeV2 === "UK" ||
      !node.shippingAddress?.countryCodeV2
        ? "UK"
        : (node.shippingAddress.countryCodeV2 ?? "UK");
    const hoursToDispatch =
      fulfilledAt && paidAt ? hoursBetween(paidAt, fulfilledAt) : null;

    const resolvedFulfilledAt =
      fulfilledAt ??
      (node.displayFulfillmentStatus === "FULFILLED" ? paidAt : null);
    const resolvedHours =
      resolvedFulfilledAt && paidAt
        ? hoursBetween(paidAt, resolvedFulfilledAt)
        : hoursToDispatch;

    // Always mirror a fulfilment row so open-queue + dispatch % stay live.
    await db.fulfilment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        personId,
        paidAt,
        fulfilledAt: resolvedFulfilledAt,
        trackingComplete,
        componentGaps,
        hoursToDispatch: resolvedHours,
        carrier,
        region,
        label: "verified",
        sourceFreshAt: new Date(),
      },
      update: {
        personId,
        paidAt,
        fulfilledAt: resolvedFulfilledAt,
        trackingComplete,
        componentGaps,
        hoursToDispatch: resolvedHours,
        carrier,
        region,
        label: "verified",
        sourceFreshAt: new Date(),
      },
    });
    fulfilments += 1;
    upserts += 1;
  }

  const inventory = await pullShopifyInventory({ shop, token });
  if (inventory.note) notes.push(inventory.note);

  const subs = await pullShopifySubscriptionContracts({ shop, token });
  if (subs.note) notes.push(subs.note);

  const summary = [
    `orders=${upserts}`,
    `fulfilments=${fulfilments}`,
    `cogsLines=${cogsLines}`,
    `stock=${inventory.upserts ?? 0}`,
    `subs=${subs.upserts ?? 0}`,
    ...notes,
  ].join("; ");

  await markRun("S1", true, summary);
  return {
    upserts,
    fulfilments,
    cogsLines,
    inventory,
    subscriptions: subs,
    notes,
  };
}

/** Inventory levels → StockItem. Best-effort; skips on missing scopes. */
export async function pullShopifyInventory(creds?: {
  shop: string;
  token: string;
}) {
  const shop = creds?.shop ?? (await resolveSecret("SHOPIFY_SHOP_DOMAIN"));
  const token = creds?.token ?? (await resolveSecret("SHOPIFY_ADMIN_TOKEN"));
  if (!shop || !token) {
    return { skipped: true as const, upserts: 0, note: "inventory skipped: no credentials" };
  }

  const query = `
    query ($cursor: String) {
      productVariants(first: 100, after: $cursor) {
        edges {
          node {
            id
            sku
            title
            displayName
            inventoryQuantity
            inventoryItem {
              unitCost { amount currencyCode }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  const result = await shopifyGraphql<{
    productVariants: {
      edges: Array<{
        node: {
          sku?: string | null;
          title?: string | null;
          displayName?: string | null;
          inventoryQuantity?: number | null;
          inventoryItem?: {
            unitCost?: { amount?: string | null } | null;
          } | null;
        };
      }>;
    };
  }>(shop, token, query);

  if (!result.httpOk) {
    return {
      skipped: true as const,
      upserts: 0,
      note: `inventory HTTP skipped: ${result.httpText ?? "error"}`,
    };
  }
  if (gqlScopeDenied(result.errors) || !result.data?.productVariants) {
    return {
      skipped: true as const,
      upserts: 0,
      note: `inventory skipped (scope): ${(result.errors ?? []).map((e) => e.message).join("; ").slice(0, 200) || "unavailable"}`,
    };
  }

  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const sold = await db.orderLine.groupBy({
    by: ["sku"],
    where: { order: { paidAt: { gte: weekAgo } } },
    _sum: { quantity: true },
  });
  const soldBySku = new Map(
    sold.map((r) => [r.sku, r._sum.quantity ?? 0] as const),
  );

  let upserts = 0;
  for (const edge of result.data.productVariants.edges) {
    const v = edge.node;
    const sku = (v.sku || v.title || "").trim();
    if (!sku) continue;
    const onHand = v.inventoryQuantity ?? 0;
    const sold7d = soldBySku.get(sku) ?? 0;
    const runRate7d = sold7d / 7;
    const daysOfCover =
      runRate7d > 0 ? onHand / runRate7d : onHand > 0 ? null : 0;

    await db.stockItem.upsert({
      where: { sku },
      create: {
        sku,
        title: v.displayName || v.title || sku,
        onHand,
        runRate7d,
        daysOfCover,
        label: "verified",
        sourceFreshAt: new Date(),
      },
      update: {
        title: v.displayName || v.title || sku,
        onHand,
        runRate7d,
        daysOfCover,
        label: "verified",
        sourceFreshAt: new Date(),
      },
    });
    upserts += 1;
  }

  return { skipped: false as const, upserts };
}

/**
 * READ-ONLY subscription contract mirror (Kaching/Loop via Shopify contracts).
 * Never writes back to Shopify. Skips gracefully without read_own_subscription_contracts.
 */
export async function pullShopifySubscriptionContracts(creds?: {
  shop: string;
  token: string;
}) {
  const shop = creds?.shop ?? (await resolveSecret("SHOPIFY_SHOP_DOMAIN"));
  const token = creds?.token ?? (await resolveSecret("SHOPIFY_ADMIN_TOKEN"));
  if (!shop || !token) {
    return {
      skipped: true as const,
      upserts: 0,
      note: "subscriptions skipped: no credentials",
    };
  }

  const query = `
    query {
      subscriptionContracts(first: 50) {
        edges {
          node {
            id
            status
            nextBillingDate
            customer { email }
            billingPolicy { interval intervalCount }
            lines(first: 5) {
              edges {
                node {
                  title
                  sellingPlanName
                  quantity
                }
              }
            }
          }
        }
      }
    }
  `;

  const result = await shopifyGraphql<{
    subscriptionContracts: {
      edges: Array<{
        node: {
          id: string;
          status?: string | null;
          nextBillingDate?: string | null;
          customer?: { email?: string | null } | null;
          billingPolicy?: {
            interval?: string | null;
            intervalCount?: number | null;
          } | null;
          lines?: {
            edges: Array<{
              node: {
                title?: string | null;
                sellingPlanName?: string | null;
                quantity?: number | null;
              };
            }>;
          } | null;
        };
      }>;
    };
  }>(shop, token, query);

  if (!result.httpOk) {
    return {
      skipped: true as const,
      upserts: 0,
      note: `subscriptions HTTP skipped: ${result.httpText ?? "error"}`,
    };
  }
  if (gqlScopeDenied(result.errors) || !result.data?.subscriptionContracts) {
    return {
      skipped: true as const,
      upserts: 0,
      note: `subscriptions skipped (scope/read-only): ${(result.errors ?? []).map((e) => e.message).join("; ").slice(0, 200) || "unavailable"}`,
    };
  }

  let upserts = 0;
  for (const edge of result.data.subscriptionContracts.edges) {
    const n = edge.node;
    const line = n.lines?.edges[0]?.node;
    const intervalCount = n.billingPolicy?.intervalCount ?? 1;
    const intervalBase = n.billingPolicy?.interval ?? "UNKNOWN";
    const interval =
      intervalCount === 1 ? intervalBase : `${intervalCount} ${intervalBase}`;

    await db.subscriptionMirror.upsert({
      where: { contractId: n.id },
      create: {
        contractId: n.id,
        product: line?.title || line?.sellingPlanName || "subscription",
        interval,
        status: n.status ?? "UNKNOWN",
        nextBillingAt: n.nextBillingDate
          ? new Date(n.nextBillingDate)
          : null,
        personEmail: n.customer?.email?.toLowerCase() ?? null,
        label: "recorded",
        sourceFreshAt: new Date(),
      },
      update: {
        product: line?.title || line?.sellingPlanName || "subscription",
        interval,
        status: n.status ?? "UNKNOWN",
        nextBillingAt: n.nextBillingDate
          ? new Date(n.nextBillingDate)
          : null,
        personEmail: n.customer?.email?.toLowerCase() ?? null,
        label: "recorded",
        sourceFreshAt: new Date(),
      },
    });
    upserts += 1;
  }

  return { skipped: false as const, upserts };
}

/** Meta Insights pull — ad set daily rows with 7d click + incremental. */
export async function pullMetaAdInsights() {
  const accessToken = await resolveSecret("META_ACCESS_TOKEN");
  const adAccountId = await resolveSecret("META_AD_ACCOUNT_ID");
  if (!accessToken || !adAccountId) {
    await markRun("S3", false, "META_* credentials not configured");
    return { skipped: true as const };
  }

  const token = accessToken;
  const accountId = adAccountId.replace(/^act_/, "");
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 7);
  const until = new Date();

  // Spec: 7-day click AND incremental attribution side by side (never use 1d_view as incremental).
  const INCR_WINDOWS = [
    "incremental_attribution",
    "incremental",
    "dda",
  ] as const;

  async function fetchInsights(windows: string[]) {
    const params = new URLSearchParams({
      level: "adset",
      time_increment: "1",
      fields:
        "adset_id,adset_name,campaign_id,campaign_name,spend,impressions,clicks,actions,action_values,frequency,cpm,ctr",
      time_range: JSON.stringify({
        since: since.toISOString().slice(0, 10),
        until: until.toISOString().slice(0, 10),
      }),
      action_attribution_windows: JSON.stringify(windows),
      access_token: token,
    });
    const res = await fetch(
      `https://graph.facebook.com/v21.0/act_${accountId}/insights?${params}`,
    );
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  }

  let windows: string[] = ["7d_click", "incremental_attribution"];
  let raw = await fetchInsights(windows);
  if (!raw.ok) {
    windows = ["7d_click", "incremental"];
    raw = await fetchInsights(windows);
  }
  if (!raw.ok) {
    windows = ["7d_click", "dda"];
    raw = await fetchInsights(windows);
  }
  if (!raw.ok) {
    await markRun("S3", false, raw.text.slice(0, 500));
    throw new Error(`Meta pull failed: ${raw.status}`);
  }

  const json = JSON.parse(raw.text) as {
    data?: Array<{
      date_start: string;
      adset_id: string;
      adset_name: string;
      campaign_id?: string;
      campaign_name?: string;
      spend: string;
      impressions: string;
      clicks: string;
      frequency?: string;
      cpm?: string;
      ctr?: string;
      action_values?: Array<{
        action_type: string;
        value: string;
        attribution_window?: string;
      }>;
      actions?: Array<{
        action_type: string;
        value: string;
        attribution_window?: string;
      }>;
    }>;
  };

  let upserts = 0;
  for (const row of json.data ?? []) {
    const matchWindow = (
      items:
        | Array<{
            action_type: string;
            value: string;
            attribution_window?: string;
          }>
        | undefined,
      preferred: string[],
    ) => {
      for (const window of preferred) {
        const hit = items?.find(
          (a) =>
            (a.action_type === "purchase" ||
              a.action_type === "omni_purchase") &&
            a.attribution_window === window,
        );
        if (hit) return hit;
      }
      return items?.find(
        (a) =>
          a.action_type === "purchase" || a.action_type === "omni_purchase",
      );
    };

    const purchaseValue = (preferred: string[]) => {
      const hit = matchWindow(row.action_values, preferred);
      return Math.round(Number(hit?.value ?? 0) * 100);
    };
    const purchases = (preferred: string[]) => {
      const hit = matchWindow(row.actions, preferred);
      return Number(hit?.value ?? 0);
    };

    await db.adDaily.upsert({
      where: {
        date_adSetId_adId: {
          date: new Date(row.date_start),
          adSetId: row.adset_id,
          adId: "aggregate",
        },
      },
      create: {
        date: new Date(row.date_start),
        campaignId: row.campaign_id,
        campaignName: row.campaign_name,
        adSetId: row.adset_id,
        adSetName: row.adset_name,
        adId: "aggregate",
        spendPence: Math.round(Number(row.spend) * 100),
        impressions: Number(row.impressions),
        clicks: Number(row.clicks),
        frequency: row.frequency ? Number(row.frequency) : null,
        cpm: row.cpm ? Number(row.cpm) : null,
        ctr: row.ctr ? Number(row.ctr) : null,
        purchaseValue7dPence: purchaseValue(["7d_click"]),
        purchases7d: purchases(["7d_click"]),
        purchaseValueIncrPence: purchaseValue([...INCR_WINDOWS]),
        purchasesIncr: purchases([...INCR_WINDOWS]),
        label: "verified",
        sourceFreshAt: new Date(),
      },
      update: {
        campaignId: row.campaign_id,
        campaignName: row.campaign_name,
        adSetName: row.adset_name,
        spendPence: Math.round(Number(row.spend) * 100),
        impressions: Number(row.impressions),
        clicks: Number(row.clicks),
        frequency: row.frequency ? Number(row.frequency) : null,
        cpm: row.cpm ? Number(row.cpm) : null,
        ctr: row.ctr ? Number(row.ctr) : null,
        purchaseValue7dPence: purchaseValue(["7d_click"]),
        purchases7d: purchases(["7d_click"]),
        purchaseValueIncrPence: purchaseValue([...INCR_WINDOWS]),
        purchasesIncr: purchases([...INCR_WINDOWS]),
        sourceFreshAt: new Date(),
      },
    });
    upserts += 1;
  }

  await markRun("S3", true);
  return { upserts };
}

/** Stripe balance + recent charges into warehouse payments. */
export async function pullStripeMoney() {
  const key = await resolveSecret("STRIPE_SECRET_KEY");
  if (!key) {
    await markRun("S2", false, "STRIPE_SECRET_KEY not configured");
    return { skipped: true as const };
  }
  const balRes = await fetch("https://api.stripe.com/v1/balance", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!balRes.ok) {
    await markRun("S2", false, `balance ${balRes.status}`);
    throw new Error("Stripe balance pull failed");
  }
  const balance = (await balRes.json()) as {
    available: Array<{ amount: number; currency: string }>;
  };
  for (const row of balance.available) {
    await db.cashBalance.upsert({
      where: { account: `Stripe ${row.currency.toUpperCase()}` },
      create: {
        account: `Stripe ${row.currency.toUpperCase()}`,
        currency: row.currency,
        balanceMinor: row.amount,
        label: "verified",
        recordedAt: new Date(),
      },
      update: {
        balanceMinor: row.amount,
        recordedAt: new Date(),
        label: "verified",
      },
    });
  }
  await markRun("S2", true);
  return { ok: true as const };
}
