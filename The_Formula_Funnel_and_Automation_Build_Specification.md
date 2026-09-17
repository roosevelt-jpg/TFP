# The Formula Funnel and Automation Build Specification

**Implementation instructions for the Cursor engineering agent**

## Purpose

This document defines the production implementation required to convert the current landing page and checkout into a measurable, consent-aware customer acquisition and programme lifecycle system. The engineering agent must preserve viable existing work, repair the offer-to-payment mismatch first, and then add reliable event tracking, customer records, messaging workflows, operational alerts and deployment controls.

| **Document field**      | **Value**                                                                |
|-------------------------|--------------------------------------------------------------------------|
| Product                 | The Formula Programme                                                    |
| Audience                | Cursor engineering agent and project owner                               |
| Document type           | Build specification and acceptance plan                                  |
| Priority                | Revenue integrity, observability and reliable lifecycle automation       |
| Current critical defect | The founder offer displays £74.50 while checkout displays £149 due today |

**Mandatory launch rule:** Do not send paid traffic to a founder offer until the advertised price, checkout total, renewal disclosure and analytics events have been validated end to end.

# 1 Cursor Agent Operating Instructions

The Cursor agent must execute this specification as an incremental refactor of the existing repository. It must not replace the current application, framework or deployment topology without written approval.

## 1.1 Required first actions

1. Inspect the complete repository structure, package manifests, environment configuration, routing, database clients, authentication, analytics, checkout implementation, webhook handlers and deployment files.

2. Identify the current framework, runtime, database, hosting platform, Stripe integration, CRM, automation platform and messaging providers.

3. Search for all price values, promotion codes, Stripe price identifiers, checkout URLs, renewal disclosures and CTA targets.

4. Inventory existing Claude-assisted automations and classify each as retain, refactor, replace or retire.

5. Write a concise implementation plan mapped to actual repository files before making changes.

6. Preserve existing working functionality and use feature flags for high-risk changes.

7. Never place production credentials in source code, browser bundles, logs or documentation.

## 1.2 Stop conditions

1. The authoritative founder price, normal price or renewal rules are not confirmed.

2. The Stripe product and price configuration cannot be reconciled with the public offer.

3. Required production accounts or webhook endpoints are owned by an unknown party.

4. Existing automations can charge customers, modify subscriptions or send messages without deterministic safeguards.

5. A requested change would require deleting customer data or replacing production infrastructure.

## 1.3 Engineering standards

| **Requirement** | **Implementation expectation**                                                                  |
|-----------------|-------------------------------------------------------------------------------------------------|
| Type safety     | Use strict types for offers, events, webhook payloads, workflow states and channel eligibility. |
| Validation      | Validate all inbound forms, API payloads and provider webhooks at the server boundary.          |
| Idempotency     | Every external event must be safe to receive more than once.                                    |
| Observability   | Use structured logs with correlation IDs; never log secrets or sensitive health answers.        |
| Testing         | Add unit, integration and end-to-end coverage for every revenue-critical path.                  |
| Security        | Verify webhook signatures, enforce least privilege and keep secrets server-side.                |
| Accessibility   | Meet WCAG-oriented keyboard, label, contrast, focus and error-message requirements.             |
| Performance     | Keep the landing page fast on mobile; avoid blocking third-party scripts and oversized media.   |

# 2 Scope and Delivery Outcomes

The implementation has five required outcomes. Work is complete only when each outcome is demonstrated in staging and production.

| **Outcome**            | **Definition of complete**                                                                             |
|------------------------|--------------------------------------------------------------------------------------------------------|
| Offer integrity        | The landing page, checkout, Stripe payment and confirmation display the same amount and renewal rules. |
| Conversion journey     | Visitors can purchase directly or enter a recoverable, permission-based lead journey.                  |
| Unified customer state | One contact record connects website, checkout, payment and communication identities.                   |
| Lifecycle automation   | Eligible customers receive the correct message once, based on verified events and state.               |
| Operational visibility | The owner can see funnel performance, workflow failures and cases requiring human action.              |

## 2.1 Included product surfaces

- Landing page

- Lead capture

- Two-step checkout handoff

- Stripe payment webhooks

- Thank-you and onboarding experience

- Email messaging

- WhatsApp messaging

- Telegram opt-in activation

- Eligible Instagram inbound messaging

- Operational alerts

- Analytics and attribution

- Admin monitoring and documentation

## 2.2 Explicit non-goals unless already supported

- Replacing the programme delivery platform

- Building a new full CRM

- Migrating all historical customer data

- Creating a medical decision system

- Unrestricted bulk messaging

- Changing the core hosting platform

- Rebuilding viable existing automations solely for stylistic consistency

# 3 Implementation Sequence

| **Phase**              | **Engineering work**                                                                             | **Exit gate**                                               |
|------------------------|--------------------------------------------------------------------------------------------------|-------------------------------------------------------------|
| 0 Discovery            | Repository audit, provider inventory, automation audit, offer confirmation and baseline capture. | Approved file-level plan and confirmed offer configuration. |
| 1 Revenue repair       | Centralize offer data, correct promotion handling and verify Stripe totals.                      | All customer-facing and charged amounts match.              |
| 2 Funnel rebuild       | Simplify sections, add lead capture and implement two-step checkout.                             | Mobile and desktop journeys pass end-to-end tests.          |
| 3 Data foundation      | Add customer, consent, event, workflow and message records.                                      | One traceable profile exists per customer.                  |
| 4 Core automation      | Implement lead, abandonment, payment and onboarding workflows.                                   | Test contacts receive correct actions once.                 |
| 5 Channels             | Activate email, WhatsApp, Telegram and eligible Instagram behavior.                              | Provider callbacks and channel boundaries are verified.     |
| 6 Alerts and reporting | Add critical alerts, daily digest and funnel dashboard.                                          | Failures and human-action cases are visible.                |
| 7 Launch               | Complete QA, controlled rollout, monitoring and handover.                                        | Production launch checklist is signed off.                  |

# 4 Offer and Pricing Integrity

This is the first production change. All amounts must originate from one server-side offer configuration. URL query parameters may select an eligible promotion, but must never define the amount charged.

## 4.1 Offer model

export interface OfferConfiguration {  
id: string;  
programmeName: string;  
currency: 'GBP';  
standardAmountMinor: number;  
promotionalAmountMinor: number \| null;  
promotionCode: string \| null;  
promotionStartsAt: string \| null;  
promotionExpiresAt: string \| null;  
maximumRedemptions: number \| null;  
stripeProductId: string;  
stripeInitialPriceId: string;  
stripeRenewalPriceId: string;  
renewalAmountMinor: number;  
renewalStartsAfterDays: number;  
guaranteeDays: number;  
active: boolean;  
}

## 4.2 Required behavior

- Resolve the offer on the server from an approved offer identifier and promotion code.

- Return a normalized public offer response to the browser; do not expose secret provider configuration.

- Create the Stripe Checkout Session from server-controlled Stripe price IDs.

- Store the resolved offer ID, amount, currency and promotion on the checkout attempt.

- Display the initial payment, renewal amount, renewal timing, cancellation route and guarantee beside every purchase CTA.

- Handle expired, invalid and exhausted promotions with a clear fallback to standard pricing.

- Prevent cached landing content from showing an obsolete promotion after the offer changes.

## 4.3 Price acceptance tests

| **Test**                | **Expected result**                                                            |
|-------------------------|--------------------------------------------------------------------------------|
| Valid founder promotion | Landing, form, checkout, Stripe and confirmation show £74.50.                  |
| No promotion            | All steps show £149.                                                           |
| Expired promotion       | User receives a clear standard-price state; no silent price change at payment. |
| Tampered browser amount | Server ignores it and uses the authoritative offer.                            |
| Renewal disclosure      | £79 monthly continuation after week eight is visible before authorization.     |
| Provider webhook        | Stored transaction amount and currency match the verified provider event.      |

# 5 Landing Page Build

The page should move the visitor through one decision at a time. Preserve the strongest proof and Kane Mousah’s authority, but remove repeated claims and competing actions before checkout.

| **Order** | **Section**        | **Required content**                                                                                            |
|-----------|--------------------|-----------------------------------------------------------------------------------------------------------------|
| 1         | Hero               | Eight-week outcome, Kane methodology, AI coach clarification, exact amount, renewal disclosure and primary CTA. |
| 2         | Short video        | A 60 to 90 second conversion explanation with poster image, captions and lazy loading.                          |
| 3         | Proof              | Two or three strongest permission-backed transformations and specific outcomes.                                 |
| 4         | Outcomes           | Lose fat, build muscle and improve performance.                                                                 |
| 5         | How it works       | Assessment, programme access, WhatsApp activation and weekly accountability.                                    |
| 6         | Human and AI roles | Explain what is automated, what Kane’s methodology controls and when a human responds.                          |
| 7         | Pricing            | Amount due, renewal, cancellation and guarantee in one decision block.                                          |
| 8         | FAQ                | Equipment, fitness level, home or gym, cancellation, renewal, support and post-payment steps.                   |
| 9         | Final CTA          | Same offer and disclosure as the hero.                                                                          |

## 5.1 Responsive and accessibility requirements

- Design mobile first and test at 320, 375, 390, 768, 1024 and 1440 pixel widths.

- Use semantic headings in order, accessible labels, visible focus, keyboard navigation and meaningful error messages.

- Avoid autoplay video with sound and provide captions or a transcript.

- Keep the mobile CTA visible without obscuring legal, form or navigation content.

- Reserve image dimensions to prevent layout shift and serve responsive modern image formats.

- Defer non-essential scripts and ensure analytics failures do not block checkout.

## 5.2 Conversion copy

Headline  
Get stronger, leaner and fitter in eight weeks with daily accountability inside WhatsApp.  
  
Support line  
An eight-week training and nutrition system based on Kane Mousah's coaching methodology, with an AI Performance Coach available between check-ins.  
  
Primary action  
Start My Eight-Week Programme  
  
Secondary action  
Watch Kane's 60-Second Explanation

# 6 Lead Capture and Checkout Flow

## 6.1 Step one customer details

| **Field**                       | **Requirement**                                     |
|---------------------------------|-----------------------------------------------------|
| Full name                       | Required; trim and validate sensible length.        |
| Email                           | Required; normalize case and verify format.         |
| WhatsApp number                 | Required for coaching; store E.164 format.          |
| Country and timezone            | Derive cautiously and allow correction.             |
| Primary goal                    | Required structured value plus optional detail.     |
| Preferred start date            | Optional or required according to onboarding rules. |
| Programme communication consent | Required where WhatsApp is necessary for delivery.  |
| Marketing consent               | Optional, separate and never preselected.           |
| Terms and privacy acceptance    | Required with policy version and timestamp.         |

## 6.2 Submission sequence

1. Validate fields on the client for usability and again on the server for security.

2. Create or update the contact using normalized email and phone identities.

3. Append consent records rather than overwriting consent history.

4. Create a checkout attempt with attribution and the resolved offer snapshot.

5. Record the checkout_started event after the server accepts the attempt.

6. Create a Stripe session with internal IDs in metadata.

7. Return only the approved Stripe redirect URL.

8. On cancellation, restore the attempt and preserve entered non-sensitive information.

## 6.3 Suggested API contract

POST /api/checkout/start  
{  
"fullName": "string",  
"email": "string",  
"whatsappNumber": "string",  
"country": "string",  
"timezone": "string",  
"primaryGoal": "fat_loss \| muscle_gain \| performance \| general_fitness",  
"preferredStartDate": "YYYY-MM-DD \| null",  
"offerId": "string",  
"promotionCode": "string \| null",  
"programmeConsent": true,  
"marketingConsent": false,  
"policyVersion": "string",  
"attribution": { "source": "string", "medium": "string", "campaign": "string" }  
}  
  
201 Response  
{ "checkoutAttemptId": "string", "checkoutUrl": "https://checkout.stripe.com/..." }

# 7 Data Model

Adapt these entities to the existing database technology. Keep provider payloads out of primary tables where normalized fields are sufficient. Use encryption or restricted storage for sensitive health-related answers.

| **Entity**          | **Minimum fields**                                                                                                                |
|---------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| contacts            | id, full_name, email_normalized, phone_e164, country, timezone, goal, preferred_channel, lifecycle_status, created_at, updated_at |
| channel_identities  | id, contact_id, channel, external_user_id, address, status, last_inbound_at, last_outbound_at                                     |
| consent_records     | id, contact_id, channel, purpose, status, source, policy_version, captured_at, withdrawn_at, ip_address                           |
| offers              | id, public fields, Stripe identifiers, promotion rules, renewal configuration, active status                                      |
| checkout_attempts   | id, contact_id, offer_snapshot, provider_session_id, status, attribution, started_at, completed_at                                |
| subscriptions       | id, contact_id, provider IDs, status, renewal_at, cancelled_at                                                                    |
| funnel_events       | event_id, event_name, contact_id, anonymous_id, session_id, properties, occurred_at, received_at                                  |
| workflow_executions | id, workflow_key, contact_id, trigger_event_id, state, current_step, next_action_at, attempt_count, last_error                    |
| messages            | id, contact_id, workflow_execution_id, channel, template_id, provider_message_id, status, timestamps, failure_reason              |
| operational_alerts  | id, severity, category, entity_type, entity_id, status, assigned_to, created_at, resolved_at                                      |

## 7.1 Identity resolution

1. Normalize email and E.164 phone before matching.

2. Do not merge contacts solely because names are similar.

3. Link provider identities only after verified inbound interaction or confirmed checkout data.

4. Record merge history and make manual correction possible.

5. Use one canonical contact ID in all provider metadata and internal events.

## 7.2 Data retention

- Define retention separately for leads, customers, consent evidence, financial records, message logs and health-sensitive responses.

- Support export, correction, suppression and deletion workflows where legally applicable.

- Keep a minimal suppression record after marketing opt-out so the customer is not accidentally re-enrolled.

# 8 Event Tracking and Attribution

| **Event**              | **Emission point**                    | **Required properties**                             |
|------------------------|---------------------------------------|-----------------------------------------------------|
| landing_view           | Client after qualified page view      | source, campaign, device, landing_version, offer_id |
| video_started          | Client video control                  | video_version, position                             |
| video_completed        | Client completion threshold           | video_version, completion_percent                   |
| cta_clicked            | Client CTA handler                    | cta_position, offer_id                              |
| lead_submitted         | Server after validated persistence    | contact_id, consent_channels                        |
| checkout_started       | Server after attempt creation         | checkout_attempt_id, offer_id, value, currency      |
| payment_succeeded      | Verified Stripe webhook               | provider_event_id, value, currency                  |
| payment_failed         | Verified Stripe webhook               | failure_category, attempt_count                     |
| programme_activated    | Server after channel activation       | activation_channel                                  |
| onboarding_incomplete  | Scheduled workflow                    | hours_since_purchase                                |
| session_missed         | Programme system or approved schedule | session_id, missed_count                            |
| checkin_submitted      | Inbound check-in handler              | week_number, risk_flag                              |
| renewal_approaching    | Scheduled workflow                    | renewal_at, value, currency                         |
| subscription_cancelled | Verified provider event               | reason_category, effective_at                       |

## 8.1 Event envelope

export interface DomainEvent\<T extends Record\<string, unknown\>\> {  
eventId: string;  
eventName: string;  
schemaVersion: number;  
occurredAt: string;  
receivedAt: string;  
contactId?: string;  
anonymousId?: string;  
sessionId?: string;  
correlationId: string;  
source: 'web' \| 'stripe' \| 'meta' \| 'telegram' \| 'email' \| 'scheduler' \| 'admin';  
properties: T;  
}

## 8.2 Attribution rules

- Capture UTM parameters, referrer, landing version and click identifiers on first qualified visit.

- Persist first-touch and last-touch attribution separately.

- Copy attribution into the checkout attempt and verified purchase event.

- Do not overwrite the original acquisition source during later direct visits.

- Deduplicate browser and server purchase events using a shared event ID.

# 9 Webhook and Queue Architecture

Provider webhooks must acknowledge quickly, persist the verified event and move business processing to a reliable queue. Slow AI calls and multi-channel delivery must not run inside the webhook request lifecycle.

## 9.1 Required endpoints

| **Endpoint**                    | **Purpose**                                                 |
|---------------------------------|-------------------------------------------------------------|
| POST /api/webhooks/stripe       | Payment, checkout, invoice, subscription and refund events. |
| GET and POST /api/webhooks/meta | Meta verification and WhatsApp or Instagram callbacks.      |
| POST /api/webhooks/telegram     | Bot updates and activation linking.                         |
| POST /api/webhooks/email        | Delivery, bounce, complaint and unsubscribe events.         |
| POST /api/events/programme      | Authenticated programme activity events where available.    |

## 9.2 Processing algorithm

1. Read the raw request body when required for signature verification.

2. Verify the provider signature or secret before parsing business data.

3. Reject invalid requests without exposing verification details.

4. Insert the provider event ID into an idempotency store with a unique constraint.

5. Return success for an already processed valid event.

6. Persist a normalized domain event and enqueue work in one reliable transaction where supported.

7. Acknowledge the provider within its required timeout.

8. Process downstream workflows asynchronously with bounded retries.

9. Move terminal failures to a dead-letter queue and create an operational alert.

## 9.3 Retry policy

| **Failure type**         | **Behavior**                                                               |
|--------------------------|----------------------------------------------------------------------------|
| Transient provider error | Exponential backoff with jitter and a capped attempt count.                |
| Rate limit               | Honor retry headers and reduce concurrency.                                |
| Invalid destination      | Mark channel identity invalid; do not retry indefinitely.                  |
| Template rejection       | Pause dependent workflow and alert the owner.                              |
| Expired token            | Pause channel dispatch, alert immediately and require credential recovery. |
| Application defect       | Send to dead-letter storage with correlation data and replay support.      |

# 10 Workflow Specifications

All workflows must evaluate current customer state immediately before each message. A delayed job must not rely only on the state that existed when it was scheduled.

## 10.1 Lead acknowledgement

**Trigger:** lead_submitted

- Send the promised resource by email.

- Send WhatsApp only when the appropriate consent exists.

- Ask for the goal and preferred start date.

- Create a sales task only for a qualified reply.

- Stop on purchase, opt-out, invalid address or manual suppression.

## 10.2 Abandoned checkout

**Trigger:** checkout_started without payment_succeeded

- After 30 minutes, send an email with the saved checkout route.

- After 6 hours, send an objection-handling email if still eligible.

- After 24 hours, send one eligible WhatsApp reminder.

- After 48 hours, create a human follow-up task for high-intent leads.

- Stop on purchase, opt-out, expiry, superseded attempt or manual closure.

## 10.3 Payment failure

**Trigger:** payment_failed

- Classify the failure without exposing sensitive payment information.

- Provide a secure provider-hosted retry route.

- Create an immediate payment-support alert.

- Stop after success, cancellation or permanent failure.

## 10.4 Purchase and onboarding

**Trigger:** payment_succeeded

- Convert the contact to customer state.

- Store verified order and subscription data.

- Send receipt and programme summary by email.

- Send WhatsApp activation instructions.

- Create the onboarding checklist and schedule the 24-hour activation check.

## 10.5 Incomplete onboarding

**Trigger:** No programme_activated event within 24 hours

- Send a state-aware resume link.

- Explain the single remaining action.

- Escalate to the owner at 48 hours.

- Stop immediately on activation.

## 10.6 Session and check-in

**Trigger:** Approved programme schedule

- Send contextual session reminders through the preferred eligible channel.

- Offer complete, reschedule and help actions.

- Track repeated missed sessions.

- Request weekly progress, blockers and injury indicators.

- Pause AI replies and escalate safety-sensitive content.

## 10.7 Renewal lifecycle

**Trigger:** Renewal date thresholds

- Send clear notices 14 days, 7 days and 2 days before renewal as configured.

- State the renewal date, amount, service, cancellation route and support contact.

- Stop promotional messaging on cancellation while preserving required service messages.

# 11 Channel Implementation Rules

| **Channel** | **Permitted implementation boundary**                                                                                                              |
|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| Email       | Authenticated domain, preference records, unsubscribe handling, delivery callbacks and separation of transactional from promotional sends.         |
| WhatsApp    | Explicit opt-in evidence, approved templates when required, service-window enforcement, delivery callbacks, opt-out suppression and human handoff. |
| Telegram    | The customer starts the bot first. Link the Telegram user ID after activation; do not cold-message arbitrary private users.                        |
| Instagram   | Prioritize customer-initiated enquiries, permitted replies, qualification and human escalation. Do not implement unrestricted outbound messaging.  |

## 11.1 Channel eligibility service

type ChannelEligibility = {  
allowed: boolean;  
channel: 'email' \| 'whatsapp' \| 'telegram' \| 'instagram';  
purpose: 'transactional' \| 'programme' \| 'marketing';  
reason?: 'no_consent' \| 'opted_out' \| 'invalid_address' \| 'outside_window' \|  
'template_required' \| 'channel_not_activated' \| 'suppressed';  
requiredTemplateId?: string;  
};

Every outbound message must pass channel eligibility immediately before dispatch. The decision and reason must be recorded for audit and troubleshooting.

## 11.2 Message personalization rules

1. Use verified fields such as goal, programme state, preferred days, timezone and last completed action.

2. Do not invent measurements, progress, availability or founder-place scarcity.

3. Do not expose health answers in notifications or message previews.

4. Provide safe defaults when optional data is missing.

5. Version message templates and preserve the template version used for each send.

# 12 Operational Alerts and Dashboard

## 12.1 Immediate alerts

| **Category** | **Trigger**                                                       | **Required action**                                    |
|--------------|-------------------------------------------------------------------|--------------------------------------------------------|
| Payment      | Repeated failure, duplicate charge, refund or cancellation intent | Create urgent owner task with secure record link.      |
| Lead         | High-intent response remains unanswered                           | Notify assigned owner after the configured SLA.        |
| Safety       | Pain, injury, medical symptoms or eating-disorder language        | Pause automation and route to a qualified human.       |
| Integration  | Webhook failures, expired token or template rejection             | Pause affected workflow and create technical alert.    |
| Delivery     | Rejection or failure rate exceeds threshold                       | Open incident and prevent uncontrolled retries.        |
| Queue        | Age, backlog or dead-letter count exceeds threshold               | Alert engineering with correlation and replay details. |

## 12.2 Daily digest

- New leads and source mix

- Checkout starts and purchases

- Abandonment count and recovery status

- Programme activations

- Messages awaiting human response

- Delivery failures and suppressed sends

- Upcoming renewals and cancellation intent

- Open operational incidents

## 12.3 Minimum dashboard metrics

| **Metric**               | **Formula**                                                           |
|--------------------------|-----------------------------------------------------------------------|
| Landing to checkout rate | Unique checkout starters divided by qualified landing sessions.       |
| Checkout completion      | Successful purchasers divided by checkout starters.                   |
| Lead capture rate        | Unique captured leads divided by qualified landing sessions.          |
| Recovery conversion      | Recovered purchasers divided by eligible abandoned checkouts.         |
| Activation rate          | Customers activated within 24 hours divided by successful purchasers. |
| Message delivery health  | Delivered messages divided by accepted dispatches by channel.         |
| Human response SLA       | Time from qualifying inbound message to first human response.         |
| Attribution coverage     | Purchases with source and funnel version divided by all purchases.    |

# 13 Security Privacy and Safety Controls

| **Control area** | **Required implementation**                                                           |
|------------------|---------------------------------------------------------------------------------------|
| Secrets          | Use environment or managed secret storage; rotate exposed or shared secrets.          |
| Authorization    | Apply least privilege to admin, support, marketing and engineering roles.             |
| Webhook trust    | Verify signatures and reject unsigned or stale requests.                              |
| Sensitive data   | Restrict health-related answers and exclude them from general analytics.              |
| Payment data     | Use Stripe-hosted payment collection; never store raw card data.                      |
| Consent          | Store channel, purpose, source, timestamp and policy version.                         |
| Opt-out          | Apply suppression immediately across relevant workflows.                              |
| Logging          | Redact tokens, cookies, message bodies and sensitive customer fields.                 |
| AI safety        | Use deterministic escalation rules and prevent medical diagnosis or treatment advice. |
| Audit            | Record administrative state changes and workflow overrides.                           |

## 13.1 AI response boundary

AI may draft routine coaching-style responses, classify intent or summarize conversations. It must not determine payment status, consent, eligibility, subscription state or safety clearance. These decisions must come from verified data and deterministic rules.

## 13.2 Safety escalation

1. Detect explicit safety terms and configurable semantic risk signals.

2. Stop automated coaching responses for the affected conversation.

3. Acknowledge receipt without diagnosing or prescribing.

4. Create a priority human-review task with the minimum necessary context.

5. Record the review outcome and explicit approval before resuming automation.

# 14 API and Service Boundaries

| **Service or module** | **Responsibility**                                                         |
|-----------------------|----------------------------------------------------------------------------|
| Offer service         | Resolve eligible prices, promotions, renewal rules and public offer views. |
| Contact service       | Identity resolution, lifecycle state and channel identities.               |
| Consent service       | Append-only consent evidence, withdrawal and eligibility inputs.           |
| Checkout service      | Checkout attempts, Stripe session creation and recovery links.             |
| Event service         | Validate, persist and publish versioned domain events.                     |
| Workflow service      | Trigger, schedule, stop, retry and audit lifecycle workflows.              |
| Messaging service     | Template rendering, eligibility, dispatch and delivery updates.            |
| Alert service         | Severity classification, routing, acknowledgement and resolution.          |
| Analytics service     | Funnel aggregates, attribution and operational metrics.                    |

## 14.1 Environment configuration

APP_BASE_URL=  
DATABASE_URL=  
ENCRYPTION_KEY=  
EVENT_SIGNING_SECRET=  
  
STRIPE_SECRET_KEY=  
STRIPE_WEBHOOK_SECRET=  
STRIPE_STANDARD_PRICE_ID=  
STRIPE_FOUNDER_PRICE_ID=  
STRIPE_RENEWAL_PRICE_ID=  
  
EMAIL_API_KEY=  
EMAIL_FROM=  
EMAIL_WEBHOOK_SECRET=  
  
WHATSAPP_ACCESS_TOKEN=  
WHATSAPP_PHONE_NUMBER_ID=  
WHATSAPP_BUSINESS_ACCOUNT_ID=  
WHATSAPP_WEBHOOK_VERIFY_TOKEN=  
  
TELEGRAM_BOT_TOKEN=  
TELEGRAM_WEBHOOK_SECRET=  
  
META_APP_ID=  
META_APP_SECRET=  
INSTAGRAM_BUSINESS_ACCOUNT_ID=  
  
QUEUE_URL=  
ALERT_DESTINATION_ID=

Use the names already established by the repository when equivalent variables exist. Do not duplicate configuration under competing names.

# 15 Testing Strategy

## 15.1 Unit tests

- Offer and promotion resolution

- Price formatting and expiry rules

- Consent and channel eligibility

- Event validation and schema versioning

- Workflow stop conditions

- Template rendering and missing-data defaults

- Risk classification and escalation guards

## 15.2 Integration tests

- Stripe session creation using test-mode identifiers

- Stripe webhook verification and duplicate delivery

- Database transaction and unique constraints

- Email delivery callbacks

- Meta webhook verification and message statuses

- Telegram activation linking

- Queue retries and dead-letter behavior

## 15.3 End-to-end scenarios

| **Scenario**           | **Expected result**                                                                         |
|------------------------|---------------------------------------------------------------------------------------------|
| Founder purchase       | Correct promotional amount, recorded attribution, one welcome sequence and activation task. |
| Standard purchase      | Standard amount throughout with the same renewal disclosure.                                |
| Checkout abandonment   | Lead enters recovery once and stops immediately after purchase.                             |
| Payment failure        | Secure retry route and immediate owner alert without exposing payment details.              |
| Opt-out                | Future promotional sends are suppressed across all workflows.                               |
| Duplicate webhook      | No duplicate customer, order, message or alert.                                             |
| Expired Meta token     | Channel pauses, technical alert opens and queued messages remain recoverable.               |
| Safety-sensitive reply | AI automation pauses and human-review task is created.                                      |
| Mobile conversion      | Complete journey works with keyboard, validation and no layout obstruction.                 |

## 15.4 Performance checks

- Run production build and resolve all errors and actionable warnings.

- Measure mobile page performance with realistic media and third-party scripts.

- Verify that analytics and messaging providers cannot block the checkout path.

- Load-test webhook ingestion and queue processing at a reasonable burst above expected traffic.

# 16 Deployment and Rollback

## 16.1 Environment progression

1. Local development with test provider credentials

2. Shared staging with test webhooks and seeded contacts

3. Production deployment with feature flags disabled by default

4. Internal production smoke test

5. Controlled traffic rollout

6. Full launch after monitoring thresholds remain healthy

## 16.2 Feature flags

funnel_v2_enabled  
server_offer_resolution_enabled  
lead_capture_enabled  
checkout_recovery_enabled  
whatsapp_workflows_enabled  
telegram_activation_enabled  
instagram_inbound_automation_enabled  
ai_coaching_responses_enabled

## 16.3 Rollback requirements

- Keep the previous stable landing route deployable during the controlled rollout.

- Allow each automation family to be disabled without taking checkout offline.

- Do not roll back database migrations destructively; use forward-compatible changes.

- Retain queued events for replay after the defect is corrected.

- Document the exact command or deployment action required to restore the previous release.

## 16.4 Production smoke test

| **Check**        | **Evidence**                                                             |
|------------------|--------------------------------------------------------------------------|
| Landing offer    | Screenshot and resolved offer response.                                  |
| Checkout amount  | Stripe test or controlled live transaction record.                       |
| Analytics        | Events visible with matching correlation IDs.                            |
| Messaging        | Approved test contact receives one correct message per eligible channel. |
| Webhook handling | Signed test events processed and duplicate delivery ignored.             |
| Alerts           | Synthetic failure reaches the designated owner.                          |
| Rollback         | Previous release or feature flag restoration confirmed.                  |

# 17 Definition of Done

- The repository builds, lints and tests successfully in CI.

- The founder and standard offer paths charge the correct amounts.

- The renewal amount and timing are visible before payment.

- Mobile and desktop funnel journeys pass end-to-end testing.

- Lead capture creates one normalized contact and append-only consent records.

- Verified payments create one customer lifecycle transition.

- Abandonment messages stop after payment or opt-out.

- Every webhook is verified, idempotent and observable.

- Every outbound send passes eligibility and suppression checks.

- Safety-sensitive replies pause automation and create a human task.

- Operational failures create actionable alerts with correlation IDs.

- Environment variables are documented without secret values.

- Database migrations, rollback instructions and provider setup are documented.

- The owner can monitor conversions, activations, delivery failures and open escalations.

- No customer-facing text contains development placeholders or unverified claims.

# 18 Required Repository Deliverables

| **Deliverable**      | **Required content**                                                                    |
|----------------------|-----------------------------------------------------------------------------------------|
| README update        | Local setup, environment variables, development commands and architecture summary.      |
| Implementation plan  | Actual files, modules, dependencies, migrations and rollout sequence.                   |
| Migration files      | Forward-compatible schema changes with safe indexes and constraints.                    |
| Provider setup guide | Stripe, email, Meta and Telegram configuration steps.                                   |
| Event catalogue      | Event names, versions, producers, consumers and properties.                             |
| Workflow catalogue   | Triggers, conditions, delays, stop rules, templates and alerts.                         |
| Runbook              | Webhook failure, token expiry, queue backlog, template rejection and replay procedures. |
| Test evidence        | Commands run, automated results and end-to-end scenario results.                        |
| Handover notes       | Known limitations, feature flags, ownership and post-launch monitoring.                 |

# 19 Cursor Execution Prompt

Provide the following instruction to Cursor together with this specification and repository access.

You are implementing The Formula Programme funnel and automation enhancement.  
  
Read this build specification completely before editing code. Begin by auditing the existing repository, current integrations and existing Claude-assisted automations. Preserve the current framework and viable implementation. Do not perform a wholesale rewrite.  
  
Your first output must be:  
1. Current architecture summary.  
2. File-by-file implementation plan.  
3. Existing automation inventory with retain, refactor, replace or retire decisions.  
4. Risks, missing credentials and blocking product decisions.  
5. Database migration plan.  
6. Test and rollback plan.  
  
Do not modify code until the plan is reviewed unless explicitly authorized to proceed autonomously.  
  
Implementation priority:  
1. Centralize the offer and repair the founder-price checkout mismatch.  
2. Add verified analytics and domain events.  
3. Implement the simplified responsive funnel and recoverable lead capture.  
4. Add the unified customer, consent, checkout and workflow data model.  
5. Implement Stripe webhooks with signature verification and idempotency.  
6. Implement email and WhatsApp core workflows.  
7. Add Telegram activation and eligible Instagram inbound handling.  
8. Add operational alerts, dashboard metrics and runbooks.  
  
For every phase:  
- Use strict types and server-side validation.  
- Add automated tests before declaring completion.  
- Run build, lint, unit, integration and relevant end-to-end tests.  
- Preserve customer data and production compatibility.  
- Never expose secrets or sensitive customer data.  
- Report changed files, migrations, environment variables and verification evidence.  
  
Stop and request a decision if offer rules are contradictory, payment configuration is unclear, production ownership is unknown or a destructive migration would be required.

# 20 Final Launch Checklist

☐ Offer configuration approved

☐ Founder and standard amounts verified

☐ Renewal disclosure verified

☐ Stripe live configuration verified

☐ Lead form and consent verified

☐ Attribution events verified

☐ Email authentication verified

☐ WhatsApp templates and webhooks verified

☐ Telegram activation verified

☐ Instagram inbound handling verified

☐ Opt-out suppression verified

☐ Duplicate-event protection verified

☐ Safety escalation verified

☐ Critical alerts verified

☐ Dashboard metrics verified

☐ Mobile and desktop QA passed

☐ Accessibility checks passed

☐ Rollback tested

☐ Runbook delivered

☐ Owner handover completed
