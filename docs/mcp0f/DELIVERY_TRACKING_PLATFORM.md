# MCP-0F.7 — Delivery Tracking Platform

**Engine:** `lib/commerce-transaction/tracking.ts` · **Surfaces:** Order Center
Tracking tab, `/tracking/[id]`, and seller/admin delivery views.

## Buyer
- **Shipment + tracking events** — `buildTrackingView` returns stage, ordered
  event history.
- **ETA** — minutes to promised time (null once settled).
- **Delay alerts** — `delayed` + `delayMinutes`; `deliveryDelayAlerts` lists
  active overdue shipments.
- **Delivery confidence** — `deliveryConfidence` 0..100 from stage progress,
  time-to-promise slack and courier on-time history (100 when delivered).
- **Delivery history** — chronological `TrackingEvent[]`.

## Seller
- **Fulfillment / courier / delivery performance** — `buildDeliveryPerformance`:
  shipments, delivered, delayed, on-time %, avg delay, per-courier health.

Operates on `Shipment[]` (events carry lifecycle states), so the tracking view
stays consistent with the order lifecycle.
