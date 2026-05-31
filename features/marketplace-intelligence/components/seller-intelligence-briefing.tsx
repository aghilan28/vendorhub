"use client";

// MCP-0E.6 — Seller Intelligence Briefing.
// A daily, actionable briefing computed from the seller's REAL operating
// snapshot (products/inventory/orders). Not a static dashboard — every item is
// an action. Falls back to a labelled sample before sign-in.

import { AlertTriangle, Boxes, Brain, Sparkles, Tag, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import type { MarketplaceIntelligenceSnapshot, Severity } from "@/lib/marketplace-intelligence";

const sevTone: Record<Severity, "default" | "secondary" | "warning" | "danger" | "ai"> = {
  info: "secondary",
  opportunity: "ai",
  watch: "ai",
  warning: "warning",
  critical: "danger",
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" | "ai" }) {
  const color = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : tone === "ai" ? "text-blue-600" : "text-primary-text";
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

export function SellerIntelligenceBriefing({ snapshot, sampled }: { snapshot: MarketplaceIntelligenceSnapshot; sampled: boolean }) {
  const { demand, inventory, pricing, health, recommendations, workflows } = snapshot;
  const topActions = recommendations.slice(0, 6);
  const triggeredWorkflows = workflows.filter((w) => w.triggered);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary-text">Daily Intelligence Briefing</h1>
          <p className="text-sm text-secondary-text">Demand forecast, inventory alerts, price guidance and growth actions from your live store data.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live data"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Store health" value={`${health.score}/100`} tone={health.tone === "critical" ? "danger" : health.tone === "healthy" ? undefined : "warning"} />
        <Stat label="Demand (30d)" value={`${demand.marketplaceForecast30d}`} tone="ai" />
        <Stat label="Stockout risks" value={String(inventory.stockoutCount)} tone={inventory.stockoutCount ? "danger" : undefined} />
        <Stat label="Avg margin" value={`${pricing.averageMarginPct}%`} tone={pricing.belowMarginCount ? "warning" : undefined} />
      </div>

      <GovernanceCard title="Today's top actions" description="Ranked by impact across demand, inventory, pricing and growth." action={<Brain className="size-4 text-blue-500" />}>
        {topActions.length ? (
          <ul className="space-y-2">
            {topActions.map((rec) => (
              <li key={rec.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={sevTone[rec.severity]}>{rec.kind.replace(/_/g, " ")}</Badge>
                  <span className="text-sm font-medium text-primary-text">{rec.title}</span>
                </div>
                <p className="mt-1 text-xs text-secondary-text">{rec.detail}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand"><Sparkles className="size-3" /> {rec.action}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-secondary-text">No actions needed right now — your store is healthy. Add products and orders to generate live intelligence.</p>
        )}
      </GovernanceCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <GovernanceCard title="Demand forecast" action={<TrendingUp className="size-4 text-secondary-text" />}>
          <div className="space-y-2">
            {demand.forecasts.filter((f) => f.scope === "product").slice(0, 6).map((f) => (
              <div key={f.refId} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-primary-text">{f.label}</span>
                <span className="text-secondary-text">{f.expectedUnits7d}/7d</span>
              </div>
            ))}
            {demand.forecasts.filter((f) => f.scope === "product").length === 0 ? <p className="text-xs text-secondary-text">No demand yet.</p> : null}
          </div>
        </GovernanceCard>

        <GovernanceCard title="Inventory alerts" action={<Boxes className="size-4 text-secondary-text" />}>
          <div className="space-y-2">
            {inventory.signals.slice(0, 6).map((s) => (
              <div key={s.productId} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-primary-text">{s.name}</span>
                <Badge variant={s.risk === "stockout" ? "danger" : s.risk === "watch" ? "warning" : "secondary"}>{s.risk.replace("_", " ")}</Badge>
              </div>
            ))}
            {inventory.signals.length === 0 ? <p className="text-xs text-secondary-text">Inventory healthy.</p> : null}
          </div>
        </GovernanceCard>

        <GovernanceCard title="Price guidance" action={<Tag className="size-4 text-secondary-text" />}>
          <div className="space-y-2">
            {pricing.signals.slice(0, 6).map((s) => (
              <div key={s.productId} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-primary-text">{s.name}</span>
                <Badge variant={s.recommendation === "raise" ? "default" : "ai"}>{s.recommendation}</Badge>
              </div>
            ))}
            {pricing.signals.length === 0 ? <p className="text-xs text-secondary-text">Pricing well-positioned.</p> : null}
          </div>
        </GovernanceCard>
      </div>

      {triggeredWorkflows.length ? (
        <GovernanceCard title="Active workflows" description="Triggered by your live data." action={<AlertTriangle className="size-4 text-secondary-text" />}>
          <div className="flex flex-wrap gap-1.5">
            {triggeredWorkflows.map((w) => (
              <Badge key={w.kind} variant="warning">{w.title} · {w.triggerCount}</Badge>
            ))}
          </div>
        </GovernanceCard>
      ) : null}
    </div>
  );
}
