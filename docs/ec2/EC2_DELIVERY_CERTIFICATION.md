# EC-2 Phase 7 — Delivery Provider Certification

**Module:** `lib/commerce-core/delivery.ts` · API: `/api/commerce/delivery/webhook` · Tables: `commerce_shipments`, `shipment_events` · Reuses real `lib/logistics/providers/shiprocket.ts`.

## Audit confirmation
Shiprocket client (104L, token caching, live API base) and `features/logistics/providers.ts` (204L) are real but were not wired into a unified commerce shipment path. EC-2 adds the abstraction + lifecycle + webhook.

## Delivered
- **Provider abstraction** — `SUPPORTED_PROVIDERS` = shiprocket, delhivery, porter, local; `isProviderSupported`.
- **Shipment creation** — `createShipment` (pincode validation, tracking number, CREATED state).
- **Status synchronization** — `applyShipmentEvent` over an 8-state machine (`CREATED → … → DELIVERED`, plus FAILED/RETURNED).
- **Tracking synchronization** — `ShipmentEvent[]` history per shipment.
- **Webhook processing** — `processWebhook` normalizes provider status strings (`normalizeProviderStatus`), idempotent (rejects duplicates + illegal transitions without error), via `POST /api/commerce/delivery/webhook` (rate-limited 120/min).
- **Failure handling + retry** — `retryFailedShipment` (resumes to PICKUP_SCHEDULED or IN_TRANSIT based on history).
- **Audit logging** — every transition recorded as an event.
- **Persistence** — `commerce_shipments` + `shipment_events` tables with RLS (order participants + admin).

## Mandated capabilities: ✅ Provider abstraction · shipment creation · tracking/status sync · delivery events · webhook processing · failure handling · retry · audit logging. Provider examples covered: Shiprocket (real client), Delhivery/Porter/Local (abstraction).

## Tests: 6 delivery tests (provider support, creation+transitions, bad pincode, full lifecycle, status normalization, idempotent webhook, retry).

**Status: COMPLETE.**
