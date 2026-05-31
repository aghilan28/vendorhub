// MCP-1A Phase 7 — Admin Seller Governance engine (deterministic, pure).
//
// Builds the six review queues (seller review / store approval / verification /
// catalog approval / risk / escalation), marketplace health and seller summary
// counts so an admin can manage hundreds of sellers.

import type {
  GovernanceQueue,
  GovernanceQueueItem,
  QueueKind,
  SellerGovernanceSnapshot,
  Severity,
  Tone,
  VerificationCase,
} from "./types";

export interface GovernanceSellerInput {
  sellerId: string;
  sellerName: string;
  applicationState: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "active";
  verification?: VerificationCase;
  catalogPendingReview?: number;
  products?: number;
  createdAtHoursAgo?: number;
  flagged?: boolean;
}

const QUEUE_LABELS: Record<QueueKind, string> = {
  seller_review: "Seller review",
  store_approval: "Store approval",
  verification: "Verification",
  catalog_approval: "Catalog approval",
  risk: "Risk",
  escalation: "Escalation",
};

function item(seller: GovernanceSellerInput, queue: QueueKind, severity: Severity, summary: string): GovernanceQueueItem {
  return {
    id: `${queue}-${seller.sellerId}`,
    sellerId: seller.sellerId,
    sellerName: seller.sellerName,
    queue,
    severity,
    summary,
    ageHours: Math.max(0, Math.round(seller.createdAtHoursAgo ?? 0)),
  };
}

export function buildGovernanceSnapshot(sellers: GovernanceSellerInput[]): SellerGovernanceSnapshot {
  const buckets: Record<QueueKind, GovernanceQueueItem[]> = {
    seller_review: [],
    store_approval: [],
    verification: [],
    catalog_approval: [],
    risk: [],
    escalation: [],
  };

  for (const seller of sellers) {
    if (seller.applicationState === "submitted") buckets.seller_review.push(item(seller, "seller_review", "warning", "New application awaiting first review."));
    if (seller.applicationState === "under_review") buckets.store_approval.push(item(seller, "store_approval", "warning", "Store pending approval decision."));

    const vc = seller.verification;
    if (vc) {
      if (vc.decision === "manual_review") buckets.verification.push(item(seller, "verification", "warning", `KYC manual review (risk ${vc.riskScore}).`));
      if (vc.decision === "reject") buckets.risk.push(item(seller, "risk", "critical", `Verification failed (risk ${vc.riskScore}).`));
      else if (vc.riskScore >= 40) buckets.risk.push(item(seller, "risk", "watch", `Elevated risk score ${vc.riskScore}.`));
      if (vc.escalated) buckets.escalation.push(item(seller, "escalation", "critical", "Escalated KYC case needs senior review."));
    }
    if ((seller.catalogPendingReview ?? 0) > 0) buckets.catalog_approval.push(item(seller, "catalog_approval", "watch", `${seller.catalogPendingReview} listings pending catalog review.`));
    if (seller.flagged) buckets.risk.push(item(seller, "risk", "warning", "Seller manually flagged."));
  }

  const queues: GovernanceQueue[] = (Object.keys(buckets) as QueueKind[]).map((kind) => ({
    kind,
    label: QUEUE_LABELS[kind],
    items: buckets[kind].sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.ageHours - a.ageHours),
  }));

  const totalPending = queues.reduce((sum, q) => sum + q.items.length, 0);
  const activeSellers = sellers.filter((s) => s.applicationState === "active").length;
  const pendingVerification = buckets.verification.length;
  const flaggedSellers = new Set(buckets.risk.map((i) => i.sellerId)).size;

  // Marketplace health: high when most sellers are active and few are flagged.
  const total = sellers.length || 1;
  const activeRatio = activeSellers / total;
  const flaggedRatio = flaggedSellers / total;
  const marketplaceHealth = Math.max(0, Math.min(100, Math.round(activeRatio * 70 + (1 - flaggedRatio) * 30 - buckets.escalation.length * 3)));

  return {
    queues,
    totalPending,
    marketplaceHealth,
    tone: healthTone(marketplaceHealth),
    sellers: sellers.length,
    activeSellers,
    pendingVerification,
    flaggedSellers,
  };
}

function severityRank(severity: Severity): number {
  return { critical: 5, warning: 4, watch: 3, opportunity: 2, info: 1 }[severity];
}

function healthTone(score: number): Tone {
  if (score >= 85) return "healthy";
  if (score >= 70) return "watch";
  if (score >= 50) return "degraded";
  return "critical";
}
