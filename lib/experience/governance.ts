import type { ExperienceInput, ExperiencePosture, ExperienceSignal, ExperienceTone } from "./types";

const personaTitles = {
  buyer: "Commerce experience",
  seller: "Seller operations",
  admin: "Operations command",
  executive: "Executive intelligence",
  developer: "Developer platform",
} as const;

const personaSummaries = {
  buyer: "Search, cart, checkout, delivery, refunds, and payment recovery stay clear and continuous.",
  seller: "Inventory, orders, payouts, logistics, disputes, and insights stay actionable without overload.",
  admin: "Governance, moderation, resilience, observability, and incident queues stay explainable.",
  executive: "Strategic signals, anomaly posture, and recovery summaries stay decision-ready.",
  developer: "APIs, webhooks, events, and operational status stay predictable for integrations.",
} as const;

const guarantees = {
  buyer: ["Cart continuity", "Payment recovery", "Delivery visibility", "Refund clarity"],
  seller: ["Action priority", "Payout transparency", "Inventory confidence", "Dispute traceability"],
  admin: ["Audit context", "Incident clarity", "Governance traceability", "Realtime fallbacks"],
  executive: ["Signal provenance", "Anomaly context", "Forecast explainability", "Recovery visibility"],
  developer: ["Webhook replay safety", "API status clarity", "Tenant isolation", "Event observability"],
} as const;

const toneRank: Record<ExperienceTone, number> = {
  healthy: 0,
  watch: 1,
  degraded: 2,
  critical: 3,
};

function strongestTone(signals: ExperienceSignal[]): ExperienceTone {
  return signals.reduce<ExperienceTone>((tone, signal) => (toneRank[signal.tone] > toneRank[tone] ? signal.tone : tone), "healthy");
}

export function assessExperiencePosture(input: ExperienceInput): ExperiencePosture {
  const signals: ExperienceSignal[] = [];

  if (input.isOnline === false) {
    signals.push({
      id: "offline-continuity",
      label: "Offline continuity active",
      detail: "Cached views remain usable while checkout, payments, and live updates wait for reconnection.",
      domain: "realtime",
      tone: "degraded",
      trustVisible: true,
      userAction: "Reconnect before starting payment or fulfillment actions.",
    });
  }

  if (input.realtimeState === "degraded" || input.realtimeState === "offline" || input.realtimeState === "connecting") {
    signals.push({
      id: "realtime-fallback",
      label: "Realtime fallback visible",
      detail: "Live state may be delayed, but the interface keeps the last trusted sync time visible.",
      domain: "realtime",
      tone: input.realtimeState === "connecting" ? "watch" : "degraded",
      trustVisible: true,
      userAction: "Use visible timestamps before making time-sensitive decisions.",
    });
  }

  if (input.aiAvailable === false) {
    signals.push({
      id: "ai-explainable-fallback",
      label: "AI fallback mode",
      detail: "AI ranking and summaries are reduced to deterministic commerce rules until intelligence recovers.",
      domain: "ai",
      tone: "watch",
      trustVisible: true,
      userAction: "Continue with filters, sort controls, and operational records.",
    });
  }

  if (input.paymentRecoverable) {
    signals.push({
      id: "payment-recovery",
      label: "Payment recovery protected",
      detail: "Inventory reservations and payment attempts are retry-safe and reconciled by the server.",
      domain: "finance",
      tone: "watch",
      trustVisible: true,
      userAction: "Retry payment from the same order context.",
    });
  }

  if (input.logisticsDelayed) {
    signals.push({
      id: "delivery-delay",
      label: "Delivery delay explained",
      detail: "ETA confidence, provider sync, and support references stay visible while logistics recovers.",
      domain: "logistics",
      tone: "watch",
      trustVisible: true,
      userAction: "Check tracking details before contacting support.",
    });
  }

  if ((input.operationalPressure ?? 0) >= 80) {
    signals.push({
      id: "operational-pressure",
      label: "Operational pressure high",
      detail: "Queues are condensed into priority actions so teams can resolve the most time-sensitive work first.",
      domain: input.persona === "seller" ? "seller_operations" : "governance",
      tone: input.operationalPressure && input.operationalPressure >= 95 ? "critical" : "degraded",
      trustVisible: true,
      userAction: "Work from the priority queue and avoid bulk actions until pressure falls.",
    });
  }

  if (input.accessibilityMode) {
    signals.push({
      id: "accessible-operation",
      label: "Accessible operation active",
      detail: "Landmarks, labels, focus states, reduced motion, and live announcements are available across this flow.",
      domain: "accessibility",
      tone: "healthy",
      trustVisible: true,
    });
  }

  if (!signals.length) {
    signals.push({
      id: "production-steady",
      label: "Production posture steady",
      detail: "Commerce, trust, realtime, and recovery states are operating inside the expected experience envelope.",
      domain: "performance",
      tone: "healthy",
      trustVisible: true,
    });
  }

  const tone = strongestTone(signals);

  return {
    persona: input.persona,
    tone,
    title: personaTitles[input.persona],
    summary: personaSummaries[input.persona],
    signals,
    guarantees: [...guarantees[input.persona]],
    userMessage:
      tone === "healthy"
        ? "Everything needed for a stable production flow is visible."
        : "The flow remains usable with clear recovery context and trust indicators.",
  };
}

export function experienceToneLabel(tone: ExperienceTone) {
  if (tone === "healthy") return "Healthy";
  if (tone === "watch") return "Watch";
  if (tone === "degraded") return "Degraded";
  return "Critical";
}
