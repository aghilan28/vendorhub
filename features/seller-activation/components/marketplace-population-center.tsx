"use client";

// MCP-1A Phase 9/10 — Marketplace Population Operations dashboard.
// Recruitment→activation funnel, operational KPIs, capacity progress toward the
// 100-seller / 10k-product targets, category expansion and population
// intelligence recommendations.

import { Activity, BarChart3, Boxes, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import type { ActivationRecommendation, MarketplacePopulationSnapshot, Severity, Tone } from "@/lib/seller-activation";

const sevBadge: Record<Severity, "default" | "secondary" | "warning" | "danger" | "ai"> = {
  info: "secondary",
  opportunity: "ai",
  watch: "ai",
  warning: "warning",
  critical: "danger",
};
const toneText: Record<Tone, string> = { healthy: "text-emerald-600", watch: "text-amber-600", degraded: "text-amber-600", critical: "text-red-600" };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary-text">{value}</p>
    </div>
  );
}

function Bar({ label, percent }: { label: string; percent: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-secondary-text">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-brand" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
    </div>
  );
}

export function MarketplacePopulationCenter({
  snapshot,
  recommendations,
  sampled,
}: {
  snapshot: MarketplacePopulationSnapshot;
  recommendations: ActivationRecommendation[];
  sampled: boolean;
}) {
  const { funnel, kpis, capacity, expansion } = snapshot;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-primary-text"><BarChart3 className="size-5" /> Marketplace Population</h1>
          <p className="text-sm text-secondary-text">Recruitment, activation and catalog population — measurable.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live data"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Stat label="Sellers" value={String(kpis.sellers)} />
        <Stat label="Active" value={String(kpis.activeSellers)} />
        <Stat label="Products" value={kpis.products.toLocaleString("en-IN")} />
        <Stat label="Published" value={kpis.publishedProducts.toLocaleString("en-IN")} />
        <Stat label="Categories" value={String(kpis.categoriesCovered)} />
        <Stat label="Activation" value={`${kpis.sellerActivationRate}%`} />
      </div>

      <Tabs defaultValue="funnel">
        <TabsList>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="expansion">Expansion</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel">
          <GovernanceCard title="Recruitment → activation funnel" action={<Users className="size-4 text-secondary-text" />}>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Registered" value={String(funnel.registered)} />
              <Stat label="Verified" value={String(funnel.verified)} />
              <Stat label="With catalog" value={String(funnel.withCatalog)} />
              <Stat label="Active" value={String(funnel.active)} />
            </div>
            <div className="space-y-3">
              <Bar label="Registered → Verified" percent={funnel.registeredToVerified} />
              <Bar label="Verified → Catalog" percent={funnel.verifiedToCatalog} />
              <Bar label="Catalog → Active" percent={funnel.catalogToActive} />
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="capacity">
          <GovernanceCard title="Capacity to target" description={`Targets: ${capacity.sellerTarget} sellers · ${capacity.productTarget.toLocaleString("en-IN")} products.`} action={<TrendingUp className="size-4 text-secondary-text" />}>
            <div className="space-y-3">
              <Bar label={`Active sellers (${kpis.activeSellers}/${capacity.sellerTarget})`} percent={capacity.sellerProgress} />
              <Bar label={`Published products (${kpis.publishedProducts.toLocaleString("en-IN")}/${capacity.productTarget.toLocaleString("en-IN")})`} percent={capacity.productProgress} />
              <Bar label="Catalog fill rate" percent={kpis.catalogFillRate} />
            </div>
            <p className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${toneText[snapshot.tone]}`}><Activity className="size-3" /> Population health: {snapshot.tone}</p>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="expansion">
          <GovernanceCard title="Category expansion" action={<Boxes className="size-4 text-secondary-text" />}>
            {expansion.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-secondary-text">
                    <tr><th className="py-2 pr-3">Category</th><th className="py-2 pr-3">Products</th><th className="py-2 pr-3">Sellers</th><th className="py-2 pr-3">Coverage</th></tr>
                  </thead>
                  <tbody>
                    {expansion.map((c) => (
                      <tr key={c.category} className="border-t border-border">
                        <td className="py-2 pr-3 font-medium text-primary-text">{c.category}</td>
                        <td className="py-2 pr-3 text-secondary-text">{c.products}</td>
                        <td className="py-2 pr-3 text-secondary-text">{c.sellers}</td>
                        <td className="py-2 pr-3"><Badge variant={c.sellers <= 1 ? "warning" : "secondary"}>{c.coverage}%</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-secondary-text">No categories populated yet.</p>
            )}
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="intelligence">
          <GovernanceCard title="Population intelligence" description="Operational recommendations on real marketplace entities.">
            {recommendations.length ? (
              <ul className="space-y-2">
                {recommendations.map((rec) => (
                  <li key={rec.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={sevBadge[rec.severity]}>{rec.kind.replace(/_/g, " ")}</Badge>
                      <span className="text-sm font-medium text-primary-text">{rec.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-secondary-text">{rec.detail}</p>
                    <p className="mt-1 text-xs font-medium text-brand">{rec.action}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary-text">No recommendations right now.</p>
            )}
          </GovernanceCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
