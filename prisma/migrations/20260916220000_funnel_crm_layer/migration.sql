-- Funnel CRM layer (spec §7)
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "waitlistId" TEXT,
    "channel" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "capturedAt" TIMESTAMPTZ NOT NULL,
    "withdrawnAt" TIMESTAMPTZ,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "customerId" TEXT,
    "waitlistId" TEXT,
    "anonymousId" TEXT,
    "sessionId" TEXT,
    "correlationId" TEXT,
    "source" TEXT NOT NULL,
    "properties" JSONB,
    "occurredAt" TIMESTAMPTZ NOT NULL,
    "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowExecution" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "workflowKey" TEXT NOT NULL,
    "customerId" TEXT,
    "waitlistId" TEXT,
    "email" TEXT,
    "triggerEventId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'running',
    "currentStep" TEXT,
    "nextActionAt" TIMESTAMPTZ,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutboundMessage" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "waitlistId" TEXT,
    "workflowExecutionId" TEXT,
    "channel" TEXT NOT NULL,
    "templateId" TEXT,
    "providerMessageId" TEXT,
    "status" TEXT NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMPTZ,

    CONSTRAINT "OutboundMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChannelIdentity" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "waitlistId" TEXT,
    "channel" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastInboundAt" TIMESTAMPTZ,
    "lastOutboundAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ChannelIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FunnelEvent_eventId_key" ON "FunnelEvent"("eventId");
CREATE INDEX "FunnelEvent_eventName_occurredAt_idx" ON "FunnelEvent"("eventName", "occurredAt");
CREATE INDEX "FunnelEvent_customerId_occurredAt_idx" ON "FunnelEvent"("customerId", "occurredAt");
CREATE INDEX "FunnelEvent_waitlistId_occurredAt_idx" ON "FunnelEvent"("waitlistId", "occurredAt");

CREATE INDEX "ConsentRecord_customerId_channel_capturedAt_idx" ON "ConsentRecord"("customerId", "channel", "capturedAt");
CREATE INDEX "ConsentRecord_waitlistId_channel_capturedAt_idx" ON "ConsentRecord"("waitlistId", "channel", "capturedAt");

CREATE UNIQUE INDEX "WorkflowExecution_dedupeKey_key" ON "WorkflowExecution"("dedupeKey");
CREATE INDEX "WorkflowExecution_workflowKey_state_idx" ON "WorkflowExecution"("workflowKey", "state");
CREATE INDEX "WorkflowExecution_nextActionAt_idx" ON "WorkflowExecution"("nextActionAt");
CREATE INDEX "WorkflowExecution_email_idx" ON "WorkflowExecution"("email");

CREATE INDEX "OutboundMessage_workflowExecutionId_idx" ON "OutboundMessage"("workflowExecutionId");
CREATE INDEX "OutboundMessage_customerId_createdAt_idx" ON "OutboundMessage"("customerId", "createdAt");
CREATE INDEX "OutboundMessage_waitlistId_createdAt_idx" ON "OutboundMessage"("waitlistId", "createdAt");

CREATE UNIQUE INDEX "ChannelIdentity_channel_externalUserId_key" ON "ChannelIdentity"("channel", "externalUserId");
CREATE INDEX "ChannelIdentity_customerId_idx" ON "ChannelIdentity"("customerId");
CREATE INDEX "ChannelIdentity_waitlistId_idx" ON "ChannelIdentity"("waitlistId");

ALTER TABLE "OutboundMessage" ADD CONSTRAINT "OutboundMessage_workflowExecutionId_fkey" FOREIGN KEY ("workflowExecutionId") REFERENCES "WorkflowExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
