// MCP-1D Phase 6 — Engagement Platform (deterministic, pure).
//
// Push / email / in-app notifications, price-drop / restock / store / order
// alerts, activity feed and engagement analytics. Delivery itself is planned
// over the existing lib/push rail; this module computes the messages + metrics.

import type {
  AlertKind,
  EngagementAnalytics,
  EngagementChannel,
  EngagementEventInput,
  EngagementMessage,
  Tone,
} from "./types";

const KIND_TITLE: Record<AlertKind, string> = {
  price_drop: "Price drop",
  restock: "Back in stock",
  store: "Store update",
  order: "Order update",
  reward: "Reward update",
  referral: "Referral update",
  campaign: "Offer for you",
  announcement: "Announcement",
};

/** Build a customer's in-app activity feed (most recent first). */
export function buildActivityFeed(events: EngagementEventInput[], customerId?: string): EngagementMessage[] {
  return events
    .filter((e) => (customerId ? e.customerId === customerId : true))
    .map((e) => ({
      id: e.id,
      kind: e.kind,
      channel: e.channel,
      title: e.title ?? KIND_TITLE[e.kind],
      body: e.body ?? defaultBody(e.kind),
      daysAgo: e.daysAgo,
      read: Boolean(e.opened),
    }))
    .sort((a, b) => a.daysAgo - b.daysAgo);
}

function defaultBody(kind: AlertKind): string {
  switch (kind) {
    case "price_drop":
      return "An item on your wishlist just dropped in price.";
    case "restock":
      return "Something you wanted is back in stock near you.";
    case "store":
      return "A store you follow has new arrivals.";
    case "order":
      return "Your order status changed.";
    case "reward":
      return "You earned reward points.";
    case "referral":
      return "A friend you invited just joined.";
    case "campaign":
      return "A personalized offer is available for you.";
    default:
      return "There's an update for you.";
  }
}

const CHANNELS: EngagementChannel[] = ["push", "email", "in_app"];

function tone(openRate: number, deliveryRate: number): Tone {
  if (deliveryRate < 80) return "degraded";
  if (openRate >= 35) return "healthy";
  if (openRate >= 18) return "watch";
  return "degraded";
}

export function buildEngagementAnalytics(events: EngagementEventInput[]): EngagementAnalytics {
  const sent = events.length;
  const delivered = events.filter((e) => e.delivered !== false).length;
  const opened = events.filter((e) => e.opened).length;
  const clicked = events.filter((e) => e.clicked).length;

  const deliveryRate = sent ? Math.round((delivered / sent) * 100) : 0;
  const openRate = delivered ? Math.round((opened / delivered) * 100) : 0;
  const clickRate = opened ? Math.round((clicked / opened) * 100) : 0;

  const byChannel = CHANNELS.map((channel) => {
    const subset = events.filter((e) => e.channel === channel);
    const del = subset.filter((e) => e.delivered !== false).length;
    const op = subset.filter((e) => e.opened).length;
    return { channel, sent: subset.length, openRate: del ? Math.round((op / del) * 100) : 0 };
  });

  return { sent, delivered, opened, clicked, deliveryRate, openRate, clickRate, byChannel, tone: tone(openRate, deliveryRate) };
}

/** A planned engagement delivery (consumed by lib/push / email rail). */
export interface PlannedDelivery {
  customerId: string;
  channel: EngagementChannel;
  kind: AlertKind;
  title: string;
  body: string;
}

/**
 * Plan re-engagement deliveries for a customer based on signals.
 * Deterministic: same signals -> same plan.
 */
export function planReengagement(input: {
  customerId: string;
  wishlistPriceDrops?: number;
  wishlistRestocks?: number;
  followedStoreUpdates?: number;
  dormant?: boolean;
  pointsExpiringSoon?: number;
}): PlannedDelivery[] {
  const out: PlannedDelivery[] = [];
  if (input.wishlistPriceDrops) {
    out.push({ customerId: input.customerId, channel: "push", kind: "price_drop", title: KIND_TITLE.price_drop, body: `${input.wishlistPriceDrops} wishlist item(s) dropped in price.` });
  }
  if (input.wishlistRestocks) {
    out.push({ customerId: input.customerId, channel: "push", kind: "restock", title: KIND_TITLE.restock, body: `${input.wishlistRestocks} wishlist item(s) are back in stock.` });
  }
  if (input.followedStoreUpdates) {
    out.push({ customerId: input.customerId, channel: "in_app", kind: "store", title: KIND_TITLE.store, body: `${input.followedStoreUpdates} followed store(s) have new arrivals.` });
  }
  if (input.pointsExpiringSoon && input.pointsExpiringSoon > 0) {
    out.push({ customerId: input.customerId, channel: "email", kind: "reward", title: KIND_TITLE.reward, body: `${input.pointsExpiringSoon} points expire within 30 days — redeem them now.` });
  }
  if (input.dormant) {
    out.push({ customerId: input.customerId, channel: "email", kind: "campaign", title: "We miss you", body: "Here's a welcome-back offer just for you." });
  }
  return out;
}
