"use client";

// MCP-1B Phase 9 — Seller Catalog Operations Center.
// Catalog health, import health, media health, quality/variant/duplicate alerts,
// catalog recommendations and a daily catalog briefing. Engine-driven.

import Link from "next/link";
import { Activity, Boxes, Gauge, Images, ListChecks, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import type { SellerCatalogSnapshot, Severity, Tone } from "@/lib/catalog-population";

const sevBadge: Record<Severity, "default" | "secondary" | "warning" | "danger" | "ai"> = {
  info: "secondary",
  opportunity: "ai",
  watch: "ai",
  warning: "warning",
  critical: "danger",
};
const toneBadge: Record<Tone, "default" | "warning" | "danger"> = { healthy: "default", watch: "warning", degraded: "warning", critical: "danger" };

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Gauge }) {
  return (
    <div className="operational-surface rounded-lg p-4">
      <Icon className="size-4 text-secondary-text" />
      <p className="mt-2 text-xs text-secondary-text">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold text-primary-text">{value}</p>
    </div>
  );
}

export function SellerCatalogOperations({ snapshot, sampled }: { snapshot: SellerCatalogSnapshot; sampled: boolean }) {
  const { quality } = snapshot;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-primary-text"><ListChecks className="size-5" /> Catalog Operations</h1>
          <p className="text-sm text-secondary-text">Catalog, import and media health with the actions that improve them.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live data"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Products" value={String(snapshot.products)} icon={Boxes} />
        <Stat label="Published" value={String(snapshot.published)} icon={ListChecks} />
        <Stat label="Catalog health" value={`${snapshot.catalogHealth}`} icon={Gauge} />
        <Stat label="Import health" value={`${snapshot.importHealth}%`} icon={Activity} />
        <Stat label="Media health" value={`${snapshot.mediaHealth}`} icon={Images} />
        <Stat label="Duplicate risk" value={`${quality.duplicateRisk}%`} icon={ShieldCheck} />
      </div>

      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts">Action center</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="briefing">Briefing</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <GovernanceCard title="Catalog action center" description="Ranked by impact.">
            {snapshot.alerts.length ? (
              <ul className="space-y-2">
                {snapshot.alerts.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={sevBadge[a.severity]}>{a.kind}</Badge>
                        <span className="text-sm font-medium text-primary-text">{a.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-secondary-text">{a.detail}</p>
                    </div>
                    <Link href={a.href} className="shrink-0 text-xs font-medium text-brand">Open</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary-text">No catalog actions pending.</p>
            )}
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="quality">
          <GovernanceCard title="Catalog quality" description={`Health ${quality.catalogHealth}/100`} action={<Badge variant={toneBadge[quality.tone]}>{quality.tone}</Badge>}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Product quality" value={`${quality.averageProductQuality}`} icon={Gauge} />
              <Stat label="Media coverage" value={`${quality.averageMediaQuality}%`} icon={Images} />
              <Stat label="Attr. completeness" value={`${quality.attributeCompleteness}%`} icon={ListChecks} />
              <Stat label="Without media" value={`${quality.withoutMedia}`} icon={Images} />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge variant="secondary">Excellent: {quality.bands.excellent}</Badge>
              <Badge variant="secondary">Good: {quality.bands.good}</Badge>
              <Badge variant="warning">Fair: {quality.bands.fair}</Badge>
              <Badge variant="danger">Poor: {quality.bands.poor}</Badge>
            </div>
            <ul className="mt-4 space-y-2">
              {quality.recommendations.map((r) => (
                <li key={r.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={sevBadge[r.severity]}>{r.kind}</Badge>
                    <span className="text-sm font-medium text-primary-text">{r.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-secondary-text">{r.detail}</p>
                  <p className="mt-1 text-xs font-medium text-brand">{r.action}</p>
                </li>
              ))}
            </ul>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="briefing">
          <GovernanceCard title="Daily catalog briefing" action={<Activity className="size-4 text-secondary-text" />}>
            <ul className="space-y-1.5 text-sm text-secondary-text">
              {snapshot.briefing.map((line, i) => (
                <li key={i}>• {line}</li>
              ))}
            </ul>
            <div className="mt-4 space-y-2 text-xs">
              <Link href="/seller/import" className="block font-medium text-brand">→ Import more products</Link>
              <Link href="/seller/media" className="block font-medium text-brand">→ Add product media</Link>
              <Link href="/seller/products" className="block font-medium text-brand">→ Edit listings</Link>
            </div>
          </GovernanceCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
