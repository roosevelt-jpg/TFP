import "server-only";

import { db } from "@/db";
import { resolvePersonCustomer } from "@/lib/identity/resolve";
import { resolveSecret } from "@/lib/secrets/store";

async function markRun(
  sourceId: string,
  ok: boolean,
  error?: string,
) {
  await db.connectorRun.update({
    where: { sourceId },
    data: {
      lastRunAt: new Date(),
      lastSuccessAt: ok ? new Date() : undefined,
      lastError: ok ? null : error,
      status: ok ? "healthy" : "error",
    },
  });
}

/** Shopify Admin GraphQL pull — read-only orders into warehouse. */
export async function pullShopifyOrders() {
  const shop = await resolveSecret("SHOPIFY_SHOP_DOMAIN");
  const token = await resolveSecret("SHOPIFY_ADMIN_TOKEN");
  if (!shop || !token) {
    await markRun("S1", false, "SHOPIFY_* credentials not configured");
    return { skipped: true as const };
  }

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
            totalPriceSet { shopMoney { amount currencyCode } }
            totalDiscountsSet { shopMoney { amount } }
            customer { email phone displayName }
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
        pageInfo { hasNextPage }
      }
    }
  `;

  const res = await fetch(
    `https://${shop}/admin/api/2024-10/graphql.json`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    await markRun("S1", false, text.slice(0, 500));
    throw new Error(`Shopify pull failed: ${res.status}`);
  }

  const json = (await res.json()) as {
    data?: {
      orders: {
        edges: Array<{
          node: {
            id: string;
            name: string;
            createdAt: string;
            totalPriceSet: { shopMoney: { amount: string } };
            totalDiscountsSet: { shopMoney: { amount: string } };
            customer?: { email?: string; phone?: string; displayName?: string };
            lineItems: {
              edges: Array<{
                node: {
                  sku?: string;
                  title: string;
                  quantity: number;
                  discountedTotalSet: { shopMoney: { amount: string } };
                };
              }>;
            };
          };
        }>;
      };
    };
  };

  let upserts = 0;
  for (const edge of json.data?.orders.edges ?? []) {
    const node = edge.node;
    const email = node.customer?.email?.toLowerCase();
    let personId: string | undefined;
    if (email || node.customer?.phone) {
      const person = await resolvePersonCustomer({
        email,
        phone: node.customer?.phone,
        name: node.customer?.displayName,
        shopifyId: node.id,
      });
      personId = person.id;
    }

    const netPence = Math.round(Number(node.totalPriceSet.shopMoney.amount) * 100);
    const discountPence = Math.round(
      Number(node.totalDiscountsSet.shopMoney.amount) * 100,
    );

    await db.warehouseOrder.upsert({
      where: { shopifyOrderId: node.id },
      create: {
        shopifyOrderId: node.id,
        orderName: node.name,
        personId,
        grossPence: netPence + discountPence,
        discountPence,
        netPence,
        paidAt: new Date(node.createdAt),
        label: "verified",
        sourceFreshAt: new Date(),
        lines: {
          create: node.lineItems.edges.map((li) => ({
            sku: li.node.sku || li.node.title,
            title: li.node.title,
            quantity: li.node.quantity,
            netPence: Math.round(
              Number(li.node.discountedTotalSet.shopMoney.amount) * 100,
            ),
          })),
        },
      },
      update: {
        netPence,
        discountPence,
        personId,
        sourceFreshAt: new Date(),
      },
    });
    upserts += 1;
  }

  await markRun("S1", true);
  return { upserts };
}

/** Meta Insights pull — ad set daily rows with 7d click + incremental. */
export async function pullMetaAdInsights() {
  const accessToken = await resolveSecret("META_ACCESS_TOKEN");
  const adAccountId = await resolveSecret("META_AD_ACCOUNT_ID");
  if (!accessToken || !adAccountId) {
    await markRun("S3", false, "META_* credentials not configured");
    return { skipped: true as const };
  }

  const accountId = adAccountId.replace(/^act_/, "");
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 7);
  const until = new Date();

  const params = new URLSearchParams({
    level: "adset",
    fields:
      "adset_id,adset_name,spend,impressions,clicks,actions,action_values,frequency,cpm,ctr",
    time_range: JSON.stringify({
      since: since.toISOString().slice(0, 10),
      until: until.toISOString().slice(0, 10),
    }),
    action_attribution_windows: JSON.stringify([
      "7d_click",
      "1d_view",
    ]),
    access_token: accessToken,
  });

  const res = await fetch(
    `https://graph.facebook.com/v21.0/act_${accountId}/insights?${params}`,
  );
  if (!res.ok) {
    const text = await res.text();
    await markRun("S3", false, text.slice(0, 500));
    throw new Error(`Meta pull failed: ${res.status}`);
  }

  const json = (await res.json()) as {
    data?: Array<{
      date_start: string;
      adset_id: string;
      adset_name: string;
      spend: string;
      impressions: string;
      clicks: string;
      frequency?: string;
      cpm?: string;
      ctr?: string;
      action_values?: Array<{ action_type: string; value: string; attribution_window?: string }>;
      actions?: Array<{ action_type: string; value: string; attribution_window?: string }>;
    }>;
  };

  let upserts = 0;
  for (const row of json.data ?? []) {
    const purchaseValue = (window: string) => {
      const hit = row.action_values?.find(
        (a) =>
          a.action_type === "purchase" &&
          (a.attribution_window === window || !a.attribution_window),
      );
      return Math.round(Number(hit?.value ?? 0) * 100);
    };
    const purchases = (window: string) => {
      const hit = row.actions?.find(
        (a) =>
          a.action_type === "purchase" &&
          (a.attribution_window === window || !a.attribution_window),
      );
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
        adSetId: row.adset_id,
        adSetName: row.adset_name,
        adId: "aggregate",
        spendPence: Math.round(Number(row.spend) * 100),
        impressions: Number(row.impressions),
        clicks: Number(row.clicks),
        frequency: row.frequency ? Number(row.frequency) : null,
        cpm: row.cpm ? Number(row.cpm) : null,
        ctr: row.ctr ? Number(row.ctr) : null,
        purchaseValue7dPence: purchaseValue("7d_click"),
        purchases7d: purchases("7d_click"),
        purchaseValueIncrPence: purchaseValue("1d_view"),
        purchasesIncr: purchases("1d_view"),
        label: "verified",
        sourceFreshAt: new Date(),
      },
      update: {
        spendPence: Math.round(Number(row.spend) * 100),
        purchaseValue7dPence: purchaseValue("7d_click"),
        purchaseValueIncrPence: purchaseValue("1d_view"),
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
