# EC-2 Phase 8 — Transactional Communications Certification

**Module:** `lib/commerce-core/communications.ts` · Table: `email_outbox`

## Audit confirmation
Prior state: **MISSING** — only web-push (`lib/push/sender.ts`) existed; no email/transactional infrastructure.

## Delivered
- **7 templates** (`EMAIL_TEMPLATES`): order_confirmation, shipment_update, return_update, refund_update, payout_update, support_update, admin_alert — each with subject + body renderers.
- **Compose** — `composeEmail` (recipient validation, data interpolation, QUEUED state).
- **Provider abstraction** — `EmailProvider` interface (name + async send); provider-agnostic.
- **Dispatch + retry** — `dispatchEmail` with up to `MAX_EMAIL_ATTEMPTS` (3) retries; degrade-safe (no provider ⇒ stays QUEUED, never throws).
- **Delivery tracking** — message states QUEUED/SENT/FAILED with attempts + sentAt.
- **Retry handling** — `retryableEmails` (FAILED + under max attempts).
- **Queue stats** — `emailQueueStats`.
- **Persistence** — `email_outbox` table (admin-only RLS) for a worker to drain.

## Mapped to commerce events
order confirmation, shipment updates, return updates, refund updates, payout updates, support updates, admin notifications — all have templates.

## Tests: 5 communication tests (compose all templates, invalid recipient, degrade-safe queue, provider send + retry-to-failure, queue stats/retryable).

## Honest scope
Engine + templates + provider abstraction + outbox are complete and tested. A concrete provider (e.g., Resend/SES/SendGrid) plugs into `EmailProvider.send` at deploy time; until configured, messages persist QUEUED in `email_outbox` for the async worker — identical degrade-safe pattern to the rest of the platform.

**Status: COMPLETE (infrastructure); provider key is a deploy-time config.**
