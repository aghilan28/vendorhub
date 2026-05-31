"use client";

// MCP-0E.8 — Admin Marketplace Intelligence Center.
// Renders the live marketplace intelligence snapshot (health, demand,
// inventory, pricing, risk, growth, workflows) computed from REAL marketplace
// activity. Falls back to a clearly-labelled sample for preview.

import { AlertTriangle, Boxes, Brain, LineChart, Rocket, ShieldCheck, Sparkles, Tag, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import type { IntelligenceRecommendation, MarketplaceIntelligenceSnapshot, Severity } from "@/lib/marketplace-intelligence";

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

function RecRow({ rec }: { rec: IntelligenceRecommendation }) {
  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={sevTone[rec.severity]}>{rec.kind.replace(/_/g, " ")}</Badge>
        <Badge variant="secondary">{rec.activation}</Badge>
        <span className="text-sm font-medium text-primary-text">{rec.title}</span>
      </div>
      <p className="mt-1 text-xs text-secondary-text">{rec.detail}</p>
      <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand">
        <Sparkles className="size-3" /> {rec.action}
      </p>
    </li>
  );
}

export function MarketplaceIntelligenceCenter({ snapshot, sampled }: { snapshot: MarketplaceIntelligenceSnapshot; sampled: boolean }) {
  const { fabric, demand, inventory, pricing, health, risks, growth, recommendations, workflows } = snapshot;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary-text">Marketplace Intelligence Center</h1>
          <p className="text-sm text-secondary-text">Live demand, inventory, pricing, risk and growth intelligence across the marketplace — with one-click activation into execution, governance and simulation.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live data"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Health" value={`${health.score}/100`} tone={health.tone === "critical" ? "danger" : health.tone === "healthy" ? undefined : "warning"} />
        <Stat label="Demand" value={`${health.demandScore}`} tone="ai" />
        <Stat label="Inventory" value={`${health.inventoryScore}`} tone={inventory.stockoutCount ? "warning" : undefined} />
        <Stat label="Pricing" value={`${health.pricingScore}`} />
        <Stat label="Trust" value={`${health.trustScore}`} tone={fabric.totals.openDisputes ? "warning" : undefined} />
        <Stat label="Fulfilment" value={`${health.fulfillmentScore}`} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="GMV (window)" value={`Rs ${fabric.totals.gmv.toLocaleString("en-IN")}`} />
        <Stat label="Orders" value={String(fabric.totals.orders)} />
        <Stat label="Avg order" value={`Rs ${fabric.totals.averageOrderValue.toLocaleString("en-IN")}`} />
        <Stat label="Products" value={`${fabric.totals.activeProducts}/${fabric.totals.totalProducts}`} />
        <Stat label="Sellers" value={`${fabric.totals.verifiedSellers}/${fabric.totals.sellers}`} />
        <Stat label="Stockouts" value={String(inventory.stockoutCount)} tone={inventory.stockoutCount ? "danger" : undefined} />
      </div>

      <Tabs defaultValue="recommendations">
        <TabsList>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="demand">Demand</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="risk">Risk &amp; Trust</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations">
          <GovernanceCard title="Actionable recommendations" description="Ranked across the whole marketplace, each routed to execution, governance or simulation." action={<Brain className="size-4 text-blue-500" />}>
            <ul className="space-y-2">
              {recommendations.slice(0, 18).map((rec) => (
                <RecRow key={rec.id} rec={rec} />
              ))}
            </ul>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="demand">
          <GovernanceCard title="Demand intelligence" description={`Run-rate ${demand.marketplaceRunRate}/day · ~${demand.marketplaceForecast30d} units forecast (30d).`} action={<TrendingUp className="size-4 text-secondary-text" />}>
            <div className="space-y-2">
              {demand.forecasts.filter((f) => f.scope === "product").slice(0, 10).map((f) => (
                <div key={f.refId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                  <span className="text-sm font-medium text-primary-text">{f.label}</span>
                  <span className="flex items-center gap-1.5 text-xs text-secondary-text">
                    <Badge variant={f.trend === "rising" ? "default" : f.trend === "declining" ? "warning" : "secondary"}>{f.trend}</Badge>
                    {f.dailyRunRate}/day · 7d {f.expectedUnits7d} · 30d {f.expectedUnits30d} · conf {f.confidence}%
                  </span>
                </div>
              ))}
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="inventory">
          <GovernanceCard title="Inventory intelligence" description={`Health ${inventory.healthScore}/100 · ${inventory.stockoutCount} stockout · ${inventory.overstockCount} overstock · reorder ~${inventory.reorderUnits} units.`} action={<Boxes className="size-4 text-secondary-text" />}>
            <div className="space-y-2">
              {inventory.signals.slice(0, 12).map((s) => (
                <div key={s.productId} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-primary-text">{s.name}</span>
                    <Badge variant={s.risk === "stockout" ? "danger" : s.risk === "watch" ? "warning" : "secondary"}>{s.risk.replace("_", " ")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-secondary-text">{s.rationale}{s.suggestedReorder > 0 ? ` · reorder ~${s.suggestedReorder}` : ""}</p>
                </div>
              ))}
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="pricing">
          <GovernanceCard title="Pricing intelligence" description={`Avg margin ${pricing.averageMarginPct}% · ${pricing.belowMarginCount} below healthy margin.`} action={<Tag className="size-4 text-secondary-text" />}>
            <div className="space-y-2">
              {pricing.signals.slice(0, 12).map((s) => (
                <div key={s.productId} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-primary-text">{s.name}</span>
                    <Badge variant={s.recommendation === "raise" ? "default" : "ai"}>{s.recommendation}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-secondary-text">{s.rationale} · rev {s.expectedRevenueImpactPct}% · margin {s.expectedMarginImpactPct}%</p>
                </div>
              ))}
              {pricing.promotionGuidance.map((g) => (
                <p key={g} className="text-xs text-secondary-text">• {g}</p>
              ))}
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="risk">
          <GovernanceCard title="Marketplace risk &amp; trust" description="Routed to Trust Governance / Execution for resolution." action={<ShieldCheck className="size-4 text-secondary-text" />}>
            <ul className="space-y-2">
              {risks.map((r, idx) => (
                <li key={`${r.kind}-${r.refId}-${idx}`} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={sevTone[r.severity]}>{r.kind.replace(/_/g, " ")}</Badge>
                    <span className="text-sm font-medium text-primary-text">{r.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-secondary-text">{r.detail}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand"><AlertTriangle className="size-3" /> {r.recommendedAction}</p>
                </li>
              ))}
              {risks.length === 0 ? <p className="text-xs text-secondary-text">No active marketplace risks detected.</p> : null}
            </ul>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="growth">
          <GovernanceCard title="Growth intelligence" description="Expansion, demand surges, pricing headroom and discovery gaps." action={<LineChart className="size-4 text-secondary-text" />}>
            <ul className="space-y-2">
              {growth.map((g, idx) => (
                <li key={`${g.kind}-${g.refId}-${idx}`} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="ai">{g.kind.replace(/_/g, " ")}</Badge>
                    <Badge variant={g.potential === "high" ? "default" : "secondary"}>{g.potential}</Badge>
                    <span className="text-sm font-medium text-primary-text">{g.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-secondary-text">{g.detail}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand"><Sparkles className="size-3" /> {g.action}</p>
                </li>
              ))}
            </ul>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="workflows">
          <GovernanceCard title="Intelligence workflows" description="Each workflow turns recommendations into owned actions ready for activation." action={<Rocket className="size-4 text-secondary-text" />}>
            <div className="space-y-3">
              {workflows.map((w) => (
                <div key={w.kind} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-primary-text">{w.title}</span>
                    <Badge variant={w.triggered ? "warning" : "secondary"}>{w.triggered ? `${w.triggerCount} triggered` : "idle"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-secondary-text">{w.description}</p>
                  {w.actions.length ? (
                    <ul className="mt-2 space-y-1">
                      {w.actions.slice(0, 4).map((a) => (
                        <li key={a.id} className="text-xs text-secondary-text">• <span className="text-primary-text">{a.owner}</span>: {a.title} <Badge variant="secondary">{a.priority}</Badge></li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </GovernanceCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
