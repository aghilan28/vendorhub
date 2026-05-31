"use client";

// MCP-0D.4 / Journey F — Seller reputation view (improve trust score).

import { useMemo } from "react";
import { Award, Star, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { buildTrustSnapshot, SAMPLE_TRUST_INPUT } from "@/lib/trust";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" | "ai" }) {
  const color = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : tone === "ai" ? "text-blue-600" : "text-primary-text";
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

export function SellerReputationPanel() {
  const rep = useMemo(() => buildTrustSnapshot(SAMPLE_TRUST_INPUT).sellerReputations[0], []);

  const tips = [
    rep.fulfillmentQuality < 95 ? "Improve fulfilment reliability to raise your score" : null,
    rep.returnRate > 5 ? "Reduce returns by improving listing accuracy + media" : null,
    rep.responseTimeMinutes > 30 ? "Respond to buyers within 30 minutes for a Fast Responder badge" : null,
    rep.satisfaction < 90 ? "Lift ratings with quality + on-time delivery" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-primary-text">Reputation & Trust</h1>
          <p className="text-sm text-secondary-text">Your operational reputation and how to improve it.</p>
        </div>
        <Badge variant="warning">Preview (sample data)</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Trust score" value={`${rep.score}/100`} tone="ai" />
        <Stat label="Tier" value={rep.tier.replace("_", " ")} />
        <Stat label="Fulfilment" value={`${rep.fulfillmentQuality}%`} />
        <Stat label="Satisfaction" value={`${rep.satisfaction}%`} />
      </div>

      <GovernanceCard title="Reputation factors" description="What drives your score." action={<Award className="size-4 text-secondary-text" />}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Return rate" value={`${rep.returnRate}%`} tone={rep.returnRate > 5 ? "warning" : undefined} />
          <Stat label="Refund rate" value={`${rep.refundRate}%`} />
          <Stat label="Complaint rate" value={`${rep.complaintRate}%`} />
          <Stat label="Response time" value={`${rep.responseTimeMinutes}m`} />
        </div>
        {rep.badges.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {rep.badges.map((b) => (
              <Badge key={b} variant="default"><Star className="size-3" /> {b}</Badge>
            ))}
          </div>
        ) : null}
      </GovernanceCard>

      <GovernanceCard title="How to improve" description="Recommended actions to raise your reputation." action={<TrendingUp className="size-4 text-emerald-600" />}>
        {tips.length === 0 ? (
          <p className="text-sm text-secondary-text">Your reputation is strong — maintain fulfilment, ratings and response time.</p>
        ) : (
          <ul className="space-y-2">
            {tips.map((t) => (
              <li key={t} className="rounded-md border border-border p-3 text-sm text-primary-text">→ {t}</li>
            ))}
          </ul>
        )}
      </GovernanceCard>
    </div>
  );
}
