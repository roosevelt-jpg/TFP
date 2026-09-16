-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('kane', 'leah', 'lemoni', 'indigo', 'viewer');

-- CreateEnum
CREATE TYPE "DataLabel" AS ENUM ('verified', 'recorded', 'calculated');

-- CreateEnum
CREATE TYPE "BusinessLine" AS ENUM ('supplements', 'coaching', 'training', 'shared');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('p1', 'p2', 'p3');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('open', 'acknowledged', 'resolved');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'executed', 'expired', 'voided');

-- CreateEnum
CREATE TYPE "ConnectorStatus" AS ENUM ('idle', 'running', 'healthy', 'stale', 'error', 'pending_audit', 'phased');

-- CreateEnum
CREATE TYPE "ContentAssetState" AS ENUM ('uploaded', 'tagged', 'editing', 'review', 'compliance', 'awaiting_kane', 'scheduled', 'posted', 'archived', 'rejected');

-- CreateEnum
CREATE TYPE "ProgrammeLine" AS ENUM ('coaching', 'training');

-- CreateEnum
CREATE TYPE "EnrolmentStatus" AS ENUM ('active', 'paused', 'completed', 'cancelled', 'pending_onboarding');

-- CreateEnum
CREATE TYPE "LeadChannel" AS ENUM ('instagram', 'whatsapp', 'email', 'other');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('booked', 'held', 'no_show', 'closed', 'cancelled', 'rescheduled');

-- CreateEnum
CREATE TYPE "PaymentDueStatus" AS ENUM ('due', 'awaiting_kane', 'paid', 'cancelled');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'viewer',
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ,
    "refreshTokenExpiresAt" TIMESTAMPTZ,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twoFactor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "failedVerificationCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ,

    CONSTRAINT "twoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsDocument" (
    "id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "CmsDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonCustomer" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT,
    "shopifyId" TEXT,
    "stripeId" TEXT,
    "ghlId" TEXT,
    "igHandle" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "PersonCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseOrder" (
    "id" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "personId" TEXT,
    "businessLine" "BusinessLine" NOT NULL DEFAULT 'supplements',
    "orderName" TEXT,
    "grossPence" INTEGER NOT NULL,
    "discountPence" INTEGER NOT NULL DEFAULT 0,
    "netPence" INTEGER NOT NULL,
    "cogsPence" INTEGER NOT NULL DEFAULT 0,
    "shippingPence" INTEGER NOT NULL DEFAULT 0,
    "refundedPence" INTEGER NOT NULL DEFAULT 0,
    "isSubscription" BOOLEAN NOT NULL DEFAULT false,
    "isStack" BOOLEAN NOT NULL DEFAULT false,
    "isNewCustomer" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMPTZ,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    "label" "DataLabel" NOT NULL DEFAULT 'verified',
    "sourceFreshAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WarehouseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "netPence" INTEGER NOT NULL,
    "cogsPence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionMirror" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "nextBillingAt" TIMESTAMPTZ,
    "personEmail" TEXT,
    "label" "DataLabel" NOT NULL DEFAULT 'recorded',
    "sourceFreshAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SubscriptionMirror_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammeEnrolment" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "line" "ProgrammeLine" NOT NULL,
    "tier" TEXT,
    "pricePence" INTEGER NOT NULL,
    "startDate" TIMESTAMPTZ NOT NULL,
    "currentWeek" INTEGER NOT NULL DEFAULT 1,
    "endDate" TIMESTAMPTZ,
    "status" "EnrolmentStatus" NOT NULL DEFAULT 'active',
    "paymentStatus" TEXT,
    "label" "DataLabel" NOT NULL DEFAULT 'verified',
    "sourceFreshAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ProgrammeEnrolment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehousePayment" (
    "id" TEXT NOT NULL,
    "stripeChargeId" TEXT,
    "personId" TEXT,
    "amountPence" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    "productTier" TEXT,
    "businessLine" "BusinessLine" NOT NULL,
    "status" TEXT NOT NULL,
    "disputeFlag" BOOLEAN NOT NULL DEFAULT false,
    "label" "DataLabel" NOT NULL DEFAULT 'verified',
    "paidAt" TIMESTAMPTZ,
    "sourceFreshAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WarehousePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "calendlyEventId" TEXT,
    "personId" TEXT,
    "inviteeName" TEXT,
    "inviteeEmail" TEXT,
    "eventType" TEXT,
    "scheduledAt" TIMESTAMPTZ NOT NULL,
    "outcome" "CallOutcome" NOT NULL DEFAULT 'booked',
    "setter" TEXT,
    "cashCollectedPence" INTEGER NOT NULL DEFAULT 0,
    "label" "DataLabel" NOT NULL DEFAULT 'verified',
    "sourceFreshAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadThread" (
    "id" TEXT NOT NULL,
    "channel" "LeadChannel" NOT NULL,
    "externalId" TEXT NOT NULL,
    "personId" TEXT,
    "contactName" TEXT,
    "snippet" TEXT,
    "intentScore" INTEGER NOT NULL DEFAULT 0,
    "lastInboundAt" TIMESTAMPTZ,
    "lastReplyAt" TIMESTAMPTZ,
    "highIntent" BOOLEAN NOT NULL DEFAULT false,
    "label" "DataLabel" NOT NULL DEFAULT 'verified',
    "sourceFreshAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "LeadThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affiliate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "channel" TEXT,
    "agreementSigned" BOOLEAN NOT NULL DEFAULT false,
    "lastPostLink" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateCode" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "commissionPence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AffiliateCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "onHand" INTEGER NOT NULL DEFAULT 0,
    "runRate7d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "daysOfCover" DOUBLE PRECISION,
    "stackOrdersCover" DOUBLE PRECISION,
    "label" "DataLabel" NOT NULL DEFAULT 'verified',
    "sourceFreshAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fulfilment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "personId" TEXT,
    "paidAt" TIMESTAMPTZ,
    "fulfilledAt" TIMESTAMPTZ,
    "trackingComplete" BOOLEAN NOT NULL DEFAULT false,
    "componentGaps" INTEGER NOT NULL DEFAULT 0,
    "hoursToDispatch" DOUBLE PRECISION,
    "carrier" TEXT,
    "region" TEXT NOT NULL DEFAULT 'UK',
    "label" "DataLabel" NOT NULL DEFAULT 'verified',
    "sourceFreshAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Fulfilment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdDaily" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "campaignId" TEXT,
    "campaignName" TEXT,
    "adSetId" TEXT NOT NULL,
    "adSetName" TEXT NOT NULL,
    "adId" TEXT,
    "adName" TEXT,
    "spendPence" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "purchases7d" INTEGER NOT NULL DEFAULT 0,
    "purchaseValue7dPence" INTEGER NOT NULL DEFAULT 0,
    "purchasesIncr" INTEGER NOT NULL DEFAULT 0,
    "purchaseValueIncrPence" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION,
    "cpm" DOUBLE PRECISION,
    "frequency" DOUBLE PRECISION,
    "reviewStatus" TEXT,
    "label" "DataLabel" NOT NULL DEFAULT 'verified',
    "sourceFreshAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AdDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDaily" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "revenuePence" INTEGER NOT NULL DEFAULT 0,
    "opens" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "bounceRate" DOUBLE PRECISION,
    "spamRate" DOUBLE PRECISION,
    "status" TEXT,
    "label" "DataLabel" NOT NULL DEFAULT 'verified',
    "sourceFreshAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "EmailDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTxn" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "description" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    "account" TEXT,
    "businessLine" "BusinessLine" NOT NULL DEFAULT 'shared',
    "rowNumber" INTEGER,
    "uploadBatch" TEXT,
    "label" "DataLabel" NOT NULL DEFAULT 'recorded',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "FinanceTxn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentDue" (
    "id" TEXT NOT NULL,
    "payee" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    "dueDate" DATE NOT NULL,
    "category" TEXT NOT NULL,
    "status" "PaymentDueStatus" NOT NULL DEFAULT 'due',
    "isTeamPay" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "label" "DataLabel" NOT NULL DEFAULT 'recorded',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "PaymentDue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "firedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMPTZ,
    "resolvedAt" TIMESTAMPTZ,
    "threadKey" TEXT,
    "telegramMsgId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "objectIds" JSONB NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB,
    "reach" TEXT,
    "reversible" BOOLEAN NOT NULL DEFAULT true,
    "specialistVerdict" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "approvedAt" TIMESTAMPTZ,
    "rejectedAt" TIMESTAMPTZ,
    "executedAt" TIMESTAMPTZ,
    "verificationResult" TEXT,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiValue" (
    "id" TEXT NOT NULL,
    "personKey" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT,
    "label" "DataLabel" NOT NULL DEFAULT 'calculated',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "KpiValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeEvent" (
    "id" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentAsset" (
    "id" TEXT NOT NULL,
    "hubAssetId" TEXT,
    "uploader" TEXT NOT NULL,
    "tags" JSONB,
    "creatorLicence" BOOLEAN NOT NULL DEFAULT false,
    "state" "ContentAssetState" NOT NULL DEFAULT 'uploaded',
    "brief" TEXT,
    "filmingDay" DATE,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ContentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostCard" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "scheduledAt" TIMESTAMPTZ,
    "caption" TEXT,
    "coverUrl" TEXT,
    "complianceResult" TEXT,
    "compliancePass" BOOLEAN NOT NULL DEFAULT false,
    "paidBoostFlag" BOOLEAN NOT NULL DEFAULT false,
    "approvalId" TEXT,
    "postUrl" TEXT,
    "status" "ContentAssetState" NOT NULL DEFAULT 'awaiting_kane',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "PostCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostMetric" (
    "id" TEXT NOT NULL,
    "postCardId" TEXT NOT NULL,
    "checkpoint" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'TFP',
    "platform" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMPTZ,
    "publishingLimit" INTEGER,
    "approvalMode" TEXT NOT NULL DEFAULT 'every_post',
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "meta" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectorRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ConnectorStatus" NOT NULL DEFAULT 'idle',
    "lastRunAt" TIMESTAMPTZ,
    "lastSuccessAt" TIMESTAMPTZ,
    "lastError" TEXT,
    "scheduleNote" TEXT,
    "writeGated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ConnectorRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertThreshold" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AlertThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySnapshot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "revenuePence" INTEGER NOT NULL DEFAULT 0,
    "adSpendPence" INTEGER NOT NULL DEFAULT 0,
    "contributionPence" INTEGER NOT NULL DEFAULT 0,
    "cashBalancePence" INTEGER,
    "amer" DOUBLE PRECISION,
    "newLeads" INTEGER NOT NULL DEFAULT 0,
    "label" "DataLabel" NOT NULL DEFAULT 'calculated',
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "DailySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashBalance" (
    "id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "balanceMinor" INTEGER NOT NULL,
    "label" "DataLabel" NOT NULL DEFAULT 'recorded',
    "recordedAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "CashBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramMessageLog" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "twoFactor_userId_key" ON "twoFactor"("userId");

-- CreateIndex
CREATE INDEX "CmsDocument_namespace_idx" ON "CmsDocument"("namespace");

-- CreateIndex
CREATE UNIQUE INDEX "CmsDocument_namespace_key_key" ON "CmsDocument"("namespace", "key");

-- CreateIndex
CREATE UNIQUE INDEX "PersonCustomer_email_key" ON "PersonCustomer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PersonCustomer_shopifyId_key" ON "PersonCustomer"("shopifyId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonCustomer_stripeId_key" ON "PersonCustomer"("stripeId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonCustomer_ghlId_key" ON "PersonCustomer"("ghlId");

-- CreateIndex
CREATE INDEX "PersonCustomer_phone_idx" ON "PersonCustomer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseOrder_shopifyOrderId_key" ON "WarehouseOrder"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "WarehouseOrder_paidAt_idx" ON "WarehouseOrder"("paidAt");

-- CreateIndex
CREATE INDEX "WarehouseOrder_personId_idx" ON "WarehouseOrder"("personId");

-- CreateIndex
CREATE INDEX "WarehouseOrder_businessLine_paidAt_idx" ON "WarehouseOrder"("businessLine", "paidAt");

-- CreateIndex
CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");

-- CreateIndex
CREATE INDEX "OrderLine_sku_idx" ON "OrderLine"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionMirror_contractId_key" ON "SubscriptionMirror"("contractId");

-- CreateIndex
CREATE INDEX "ProgrammeEnrolment_personId_idx" ON "ProgrammeEnrolment"("personId");

-- CreateIndex
CREATE INDEX "ProgrammeEnrolment_line_status_idx" ON "ProgrammeEnrolment"("line", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WarehousePayment_stripeChargeId_key" ON "WarehousePayment"("stripeChargeId");

-- CreateIndex
CREATE INDEX "WarehousePayment_personId_idx" ON "WarehousePayment"("personId");

-- CreateIndex
CREATE INDEX "WarehousePayment_businessLine_paidAt_idx" ON "WarehousePayment"("businessLine", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "Call_calendlyEventId_key" ON "Call"("calendlyEventId");

-- CreateIndex
CREATE INDEX "Call_scheduledAt_idx" ON "Call"("scheduledAt");

-- CreateIndex
CREATE INDEX "Call_setter_idx" ON "Call"("setter");

-- CreateIndex
CREATE INDEX "LeadThread_lastInboundAt_idx" ON "LeadThread"("lastInboundAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeadThread_channel_externalId_key" ON "LeadThread"("channel", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateCode_code_key" ON "AffiliateCode"("code");

-- CreateIndex
CREATE INDEX "AffiliateCode_affiliateId_idx" ON "AffiliateCode"("affiliateId");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_sku_key" ON "StockItem"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Fulfilment_orderId_key" ON "Fulfilment"("orderId");

-- CreateIndex
CREATE INDEX "Fulfilment_fulfilledAt_idx" ON "Fulfilment"("fulfilledAt");

-- CreateIndex
CREATE INDEX "Fulfilment_region_idx" ON "Fulfilment"("region");

-- CreateIndex
CREATE INDEX "AdDaily_date_idx" ON "AdDaily"("date");

-- CreateIndex
CREATE INDEX "AdDaily_adSetId_date_idx" ON "AdDaily"("adSetId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AdDaily_date_adSetId_adId_key" ON "AdDaily"("date", "adSetId", "adId");

-- CreateIndex
CREATE INDEX "EmailDaily_date_idx" ON "EmailDaily"("date");

-- CreateIndex
CREATE INDEX "EmailDaily_name_date_idx" ON "EmailDaily"("name", "date");

-- CreateIndex
CREATE INDEX "FinanceTxn_date_idx" ON "FinanceTxn"("date");

-- CreateIndex
CREATE INDEX "FinanceTxn_uploadBatch_idx" ON "FinanceTxn"("uploadBatch");

-- CreateIndex
CREATE INDEX "PaymentDue_dueDate_idx" ON "PaymentDue"("dueDate");

-- CreateIndex
CREATE INDEX "PaymentDue_status_idx" ON "PaymentDue"("status");

-- CreateIndex
CREATE INDEX "Alert_status_severity_idx" ON "Alert"("status", "severity");

-- CreateIndex
CREATE INDEX "Alert_threadKey_idx" ON "Alert"("threadKey");

-- CreateIndex
CREATE INDEX "Alert_ruleId_firedAt_idx" ON "Alert"("ruleId", "firedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_token_key" ON "ApprovalRequest"("token");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_expiresAt_idx" ON "ApprovalRequest"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "KpiValue_personKey_date_idx" ON "KpiValue"("personKey", "date");

-- CreateIndex
CREATE UNIQUE INDEX "KpiValue_personKey_kpiId_date_key" ON "KpiValue"("personKey", "kpiId", "date");

-- CreateIndex
CREATE INDEX "ChangeEvent_objectType_objectId_occurredAt_idx" ON "ChangeEvent"("objectType", "objectId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentAsset_hubAssetId_key" ON "ContentAsset"("hubAssetId");

-- CreateIndex
CREATE INDEX "PostCard_status_scheduledAt_idx" ON "PostCard"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "PostCard_assetId_idx" ON "PostCard"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "PostMetric_postCardId_checkpoint_key" ON "PostMetric"("postCardId", "checkpoint");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_platform_account_key" ON "Channel"("platform", "account");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectorRun_sourceId_key" ON "ConnectorRun"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "AlertThreshold_ruleId_key" ON "AlertThreshold"("ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "DailySnapshot_date_key" ON "DailySnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CashBalance_account_key" ON "CashBalance"("account");

-- CreateIndex
CREATE INDEX "TelegramMessageLog_chatId_createdAt_idx" ON "TelegramMessageLog"("chatId", "createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twoFactor" ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseOrder" ADD CONSTRAINT "WarehouseOrder_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "WarehouseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgrammeEnrolment" ADD CONSTRAINT "ProgrammeEnrolment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehousePayment" ADD CONSTRAINT "WarehousePayment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadThread" ADD CONSTRAINT "LeadThread_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateCode" ADD CONSTRAINT "AffiliateCode_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fulfilment" ADD CONSTRAINT "Fulfilment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "WarehouseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fulfilment" ADD CONSTRAINT "Fulfilment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "PersonCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostCard" ADD CONSTRAINT "PostCard_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ContentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMetric" ADD CONSTRAINT "PostMetric_postCardId_fkey" FOREIGN KEY ("postCardId") REFERENCES "PostCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

