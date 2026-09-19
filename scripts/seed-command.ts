/**
 * Seed TFP Command warehouse + bootstrap Kane admin (invite-only).
 * Usage: pnpm db:seed:command
 */
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set (expected in .env.local or .env)");
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});
const db = new PrismaClient({ adapter });

function yesterday() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function bootstrapAdmin() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const name = process.env.ADMIN_BOOTSTRAP_NAME ?? "Kane Mousah";
  if (!email || !password) {
    console.log("Skipping admin bootstrap (ADMIN_BOOTSTRAP_* unset)");
    return;
  }

  const hashed = await hashPassword(password);
  let user = await db.user.findUnique({ where: { email } });
  if (user) {
    await db.user.update({
      where: { id: user.id },
      data: { role: "kane", name, emailVerified: true },
    });
    const account = await db.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });
    if (account) {
      await db.account.update({
        where: { id: account.id },
        data: { password: hashed },
      });
    } else {
      await db.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: hashed,
        },
      });
    }
    console.log(`Admin user updated: ${email} (role=kane, password reset)`);
    return;
  }

  user = await db.user.create({
    data: {
      email,
      name,
      emailVerified: true,
      role: "kane",
      twoFactorEnabled: false,
    },
  });
  await db.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: hashed,
    },
  });
  console.log(`Created Kane admin: ${email} — enable 2FA at /admin/setup-2fa`);
}

async function seedConnectors() {
  const sources = [
    ["S1", "Shopify Admin GraphQL", "15 min + webhooks", false, "healthy"],
    ["S2", "Stripe", "Webhooks + hourly", false, "healthy"],
    ["S3", "Meta Marketing API", "Hourly", false, "healthy"],
    ["S4", "Klaviyo", "Hourly", false, "healthy"],
    ["S5", "GoHighLevel", "15 min", false, "healthy"],
    ["S6", "n8n", "5 min", false, "healthy"],
    ["S7", "Gmail", "5 min", false, "healthy"],
    ["S8", "Calendly", "Webhooks", false, "healthy"],
    ["S9", "Instagram DMs", "15 min via GHL", false, "healthy"],
    ["S10", "Leah finance template", "Daily upload", false, "healthy"],
    ["S11", "Uptime checks", "5 min", false, "healthy"],
    ["S12", "Revolut Business", "Phase 5", false, "phased"],
    ["S13", "Frame.io V4", "Webhooks", false, "healthy"],
    ["S14", "Instagram Graph API", "Hourly + on publish", true, "pending_audit"],
    ["S15", "TikTok Content Posting", "Hourly + on publish", true, "pending_audit"],
    ["S16", "YouTube Data + Analytics", "Hourly + on publish", true, "pending_audit"],
  ] as const;

  for (const [sourceId, name, scheduleNote, writeGated, status] of sources) {
    await db.connectorRun.upsert({
      where: { sourceId },
      create: {
        sourceId,
        name,
        scheduleNote,
        writeGated,
        status,
        lastSuccessAt: status === "healthy" ? new Date() : null,
      },
      update: { name, scheduleNote, writeGated, status },
    });
  }
}

async function seedWarehouse() {
  const y = yesterday();

  await db.dailySnapshot.upsert({
    where: { date: y },
    create: {
      date: y,
      revenuePence: 1_824_000,
      adSpendPence: 214_000,
      contributionPence: 986_000,
      cashBalancePence: 6_140_000,
      amer: 3.1,
      newLeads: 37,
      label: "calculated",
    },
    update: {
      revenuePence: 1_824_000,
      adSpendPence: 214_000,
      contributionPence: 986_000,
      amer: 3.1,
    },
  });

  for (const [account, currency, balanceMinor] of [
    ["Revolut GBP", "gbp", 4_122_000],
    ["Revolut AED", "aed", 6_890_000],
    ["Stripe balance", "gbp", 1_264_000],
  ] as const) {
    await db.cashBalance.upsert({
      where: { account },
      create: {
        account,
        currency,
        balanceMinor,
        label: account.startsWith("Stripe") ? "verified" : "recorded",
        recordedAt: new Date(),
      },
      update: { balanceMinor, recordedAt: new Date() },
    });
  }

  const person = await db.personCustomer.upsert({
    where: { email: "r.haddad@example.com" },
    create: {
      email: "r.haddad@example.com",
      name: "R. Haddad",
      phone: "+971500000001",
    },
    update: {},
  });

  await db.warehouseOrder.deleteMany({
    where: { shopifyOrderId: { startsWith: "seed-" } },
  });

  for (const [i, line, net, stack] of [
    [1, "supplements", 384_000, true],
    [2, "supplements", 246_000, true],
    [3, "coaching", 280_000, false],
    [4, "training", 7_900, false],
  ] as const) {
    const order = await db.warehouseOrder.create({
      data: {
        shopifyOrderId: `seed-${i}`,
        orderName: `#TFP-SEED-${i}`,
        personId: person.id,
        businessLine: line,
        grossPence: net,
        netPence: net,
        cogsPence: line === "supplements" ? Math.round(net * 0.35) : 0,
        shippingPence: line === "supplements" ? 450 : 0,
        isStack: stack,
        isNewCustomer: i % 2 === 1,
        paidAt: y,
        label: "verified",
        sourceFreshAt: new Date(),
        lines: {
          create: [
            {
              sku: stack ? "COMPLETE-STACK-M" : line === "coaching" ? "ELITE" : "TRAIN-8WK",
              title: stack ? "Complete Stack — Male" : line,
              quantity: 1,
              netPence: net,
              cogsPence: line === "supplements" ? Math.round(net * 0.35) : 0,
            },
          ],
        },
      },
    });

    if (line === "supplements") {
      await db.fulfilment.create({
        data: {
          orderId: order.id,
          personId: person.id,
          paidAt: y,
          fulfilledAt: i === 1 ? null : new Date(),
          trackingComplete: i !== 1,
          componentGaps: i === 1 ? 1 : 0,
          hoursToDispatch: i === 1 ? 19 : 8,
          region: "UK",
          label: "verified",
          sourceFreshAt: new Date(),
        },
      });
    }
  }

  for (const [sku, title, onHand, days] of [
    ["WHEY-2KG", "Whey Protein 2kg", 120, 18],
    ["STACK-M", "Complete Stack — Male", 80, 26],
    ["STACK-F", "Complete Stack — Female", 90, 44],
    ["CREATINE", "Creatine Monohydrate", 300, 61],
  ] as const) {
    await db.stockItem.upsert({
      where: { sku },
      create: {
        sku,
        title,
        onHand,
        runRate7d: onHand / Math.max(days, 1),
        daysOfCover: days,
        stackOrdersCover: days / 7,
        label: "verified",
        sourceFreshAt: new Date(),
      },
      update: { onHand, daysOfCover: days, sourceFreshAt: new Date() },
    });
  }

  await db.adDaily.deleteMany({ where: { adSetId: { startsWith: "seed-" } } });
  for (const [id, name, spend, value7d, valueIncr] of [
    ["seed-cold-v3", "Cold — Reels — Stack V3", 64_000, 89_600, 70_400],
    ["seed-retarget", "Retarget — ATC 7d", 21_000, 142_800, 109_200],
    ["seed-ugc", "Cold — UGC — Testimonial", 48_000, 144_000, 124_800],
  ] as const) {
    await db.adDaily.create({
      data: {
        date: y,
        adSetId: id,
        adSetName: name,
        adId: `${id}-ad`,
        spendPence: spend,
        purchaseValue7dPence: value7d,
        purchaseValueIncrPence: valueIncr,
        purchases7d: Math.round(value7d / 4300),
        impressions: 40_000,
        clicks: 800,
        label: "verified",
        sourceFreshAt: new Date(),
      },
    });
  }

  await db.changeEvent.create({
    data: {
      objectType: "ad_set",
      objectId: "seed-cold-v3",
      changeType: "budget_edit",
      occurredAt: new Date("2026-09-12T10:00:00Z"),
      meta: { note: "Budget edit — split averages before/after" },
    },
  });

  await db.emailDaily.create({
    data: {
      date: y,
      name: "Founder launch — cold list",
      kind: "campaign",
      recipients: 18_200,
      revenuePence: 619_000,
      status: "Sent",
      bounceRate: 0.008,
      spamRate: 0.0002,
      label: "verified",
      sourceFreshAt: new Date(),
    },
  });

  await db.leadThread.upsert({
    where: {
      channel_externalId: { channel: "instagram", externalId: "IG-90410" },
    },
    create: {
      channel: "instagram",
      externalId: "IG-90410",
      snippet: "What's included in Elite and can I start this week?",
      highIntent: true,
      intentScore: 90,
      lastInboundAt: new Date(Date.now() - 62 * 60_000),
      label: "verified",
      sourceFreshAt: new Date(),
    },
    update: {},
  });

  await db.alert.deleteMany({ where: { ruleId: { startsWith: "SEED-" } } });
  await db.alert.create({
    data: {
      ruleId: "SEED-C2",
      severity: "p1",
      title: "Adverse-reaction mention in an Instagram DM — Complete Stack",
      payload: { thread: "IG-88213" },
      status: "open",
      threadKey: "IG-88213",
    },
  });
  await db.alert.create({
    data: {
      ruleId: "SEED-ST1",
      severity: "p2",
      title: "Complete Stack (Male) at 26 days of cover in stack orders",
      payload: { sku: "STACK-M" },
      status: "open",
      threadKey: "STOCK-STACK-M",
    },
  });

  const { createHash, randomBytes } = await import("node:crypto");
  const token = randomBytes(24).toString("hex");
  const payload = {
    action: 'Pause ad set "Cold — Reels — Stack V3"',
    objectIds: { adSetId: "seed-cold-v3" },
  };
  await db.approvalRequest.create({
    data: {
      token,
      action: payload.action,
      objectIds: payload.objectIds,
      reach: "1 ad set, no customers",
      reversible: true,
      specialistVerdict:
        "Correct against break-even calc, touches no subscription, rollback is resume. Cites Nathan ladder layer 2.",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      payloadHash: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
      createdBy: "cto-agent",
    },
  });

  await db.call.create({
    data: {
      calendlyEventId: `seed-call-${Date.now()}`,
      inviteeName: "R. Haddad",
      inviteeEmail: person.email,
      eventType: "Elite consult",
      scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      outcome: "booked",
      setter: "Lemoni",
      personId: person.id,
      label: "verified",
      sourceFreshAt: new Date(),
    },
  });

  await db.programmeEnrolment.create({
    data: {
      personId: person.id,
      line: "coaching",
      tier: "Elite",
      pricePence: 280_000,
      startDate: new Date(),
      status: "pending_onboarding",
      label: "verified",
      sourceFreshAt: new Date(),
    },
  });

  for (let week = 1; week <= 8; week++) {
    await db.programmeEnrolment.create({
      data: {
        personId: person.id,
        line: "training",
        tier: "Challenge",
        pricePence: 7_900,
        startDate: new Date(Date.now() - week * 7 * 86_400_000),
        currentWeek: week,
        status: "active",
        label: "verified",
        sourceFreshAt: new Date(),
      },
    });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (const [personKey, kpiId, value] of [
    ["leah", "Template on time", "✓ 09:14"],
    ["leah", "Refunds this week", "£310 (cap £50/ea)"],
    ["lemoni", "Calls booked / held", "41 / 33"],
    ["lemoni", "Close rate", "34%"],
    ["indigo", "Workflow reliability", "99.2%"],
    ["asim", "24h dispatch rate", "96%"],
  ] as const) {
    await db.kpiValue.upsert({
      where: {
        personKey_kpiId_date: { personKey, kpiId, date: today },
      },
      create: {
        personKey,
        kpiId,
        date: today,
        value,
        label: "calculated",
        source: "seed",
      },
      update: { value },
    });
  }

  for (const [ruleId, label, value, unit] of [
    ["L1", "High-intent DM reply window (minutes)", 60, "min"],
    ["ST1", "Stack cover alert (days)", 30, "days"],
    ["M5", "Cold frequency alert", 2, "freq"],
  ] as const) {
    await db.alertThreshold.upsert({
      where: { ruleId },
      create: { ruleId, label, value, unit, enabled: true },
      update: { label, value, unit },
    });
  }

  await db.paymentDue.create({
    data: {
      payee: "Example Supplier Ltd",
      amountPence: 824_000,
      dueDate: new Date("2026-09-22"),
      category: "COGS",
      status: "awaiting_kane",
      label: "recorded",
    },
  });

  const asset = await db.contentAsset.create({
    data: {
      title: "Week 6 check-in reel",
      uploader: "Kane",
      state: "awaiting_kane",
      creatorLicence: true,
      tags: { concept: "check-in" },
    },
  });
  await db.postCard.create({
    data: {
      assetId: asset.id,
      platform: "instagram",
      account: "@theformulaperformance",
      scheduledAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      caption: "Week 6 — stay consistent.",
      compliancePass: true,
      complianceResult: "No hormone/TRT claims found",
      status: "awaiting_kane",
    },
  });

  await db.cmsDocument.upsert({
    where: {
      namespace_key: { namespace: "landing", key: "announcement" },
    },
    create: {
      namespace: "landing",
      key: "announcement",
      value: "Founder launch — first 50 members, 50% off",
    },
    update: {},
  });
}

async function main() {
  await seedConnectors();
  await seedWarehouse();
  await bootstrapAdmin();
  console.log("Command seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
