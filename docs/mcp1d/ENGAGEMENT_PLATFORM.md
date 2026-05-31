# MCP-1D — Engagement Platform (Phase 6)

`lib/customer-growth/engagement.ts` — push / email / in-app notifications,
alerts, activity feed and engagement analytics. Delivery itself is planned over
the existing `lib/push` rail; this module computes the messages + metrics.

## Alerts & channels

Alert kinds: `price_drop · restock · store · order · reward · referral · campaign
· announcement`. Channels: `push · email · in_app`.

## Functions

- `buildActivityFeed(events, customerId?)` — per-customer in-app feed, most-recent
  first, with sensible default titles/bodies per kind.
- `buildEngagementAnalytics(events)` — sent / delivered / opened / clicked,
  delivery/open/click rates, per-channel breakdown and a tone.
- `planReengagement(signals)` — deterministic delivery plan from signals:
  - wishlist price drops → push price-drop
  - wishlist restocks → push restock
  - followed-store updates → in-app store alert
  - points expiring soon → email reward reminder
  - dormant → email win-back offer

## Reuse

Planned deliveries (`PlannedDelivery`) are the input contract for the existing
`lib/push/sender.ts` rail and a future email rail — no duplicate transport.

## Exit criteria — met

Customers can be re-engaged across channels with relevant, deterministic alerts,
and engagement is measurable.
