"use client";

import { AlertTriangle, BarChart3, Boxes, Languages, MapPin, PackageCheck, Search, ShieldCheck, Tags, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatting/currency";
import type { MerchantInsightSeverity, MerchantIntelligenceSnapshot } from "../types";

const severityVariant: Record<MerchantInsightSeverity, "default" | "secondary" | "warning" | "danger"> = {
  info: "secondary",
  opportunity: "default",
  warning: "warning",
  critical: "danger",
};

function ScoreTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase text-secondary-text">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-primary-text">{value}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function MerchantIntelligencePanel({ intelligence }: { intelligence: MerchantIntelligenceSnapshot }) {
  const topForecasts = intelligence.forecasts.slice(0, 4);
  const restock = intelligence.inventory.filter((item) => item.risk === "restock" || item.risk === "watch").slice(0, 4);
  const discoverability = intelligence.discoverability.slice(0, 4);
  const pricing = intelligence.pricing.slice(0, 3);
  const localizedGuidance = [intelligence.insights[0]?.localeText.ta, intelligence.insights[0]?.localeText.hi].filter(Boolean);
  const fairnessGuidance =
    intelligence.coldStart.isColdStart
      ? intelligence.coldStart.recommendations[0] ?? "Cold-start guidance will be generated after real catalog and order signals are available."
      : "Guidance balances performance history with listing quality, stock readiness, and fulfillment reliability.";

  return (
    <div className="space-y-6">
      <section className="operational-surface rounded-lg p-4" aria-labelledby="merchant-intelligence-heading">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase text-secondary-text">
              <BarChart3 className="size-4" />
              Merchant intelligence
            </div>
            <h2 id="merchant-intelligence-heading" className="mt-2 text-xl font-semibold text-primary-text">
              Seller operating intelligence
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-secondary-text">
              Forecasts, stock risk, discoverability, fulfillment reliability, pricing guardrails, and local demand signals generated from seller operations.
            </p>
          </div>
          <div className="rounded-md border border-border bg-slate-50 p-3 text-sm">
            <p className="text-xs font-medium uppercase text-secondary-text">Generated</p>
            <p className="mt-1 font-medium text-primary-text">{new Date(intelligence.generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <ScoreTile label="Health" value={intelligence.summary.healthScore} />
          <ScoreTile label="Demand" value={intelligence.summary.demandScore} />
          <ScoreTile label="Inventory" value={intelligence.summary.inventoryScore} />
          <ScoreTile label="Fulfillment" value={intelligence.summary.fulfillmentScore} />
          <ScoreTile label="Visibility" value={intelligence.summary.discoverabilityScore} />
          <ScoreTile label="Fairness" value={intelligence.summary.fairnessScore} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3" aria-label="Actionable seller insights">
        {intelligence.insights.map((insight) => (
          <article key={insight.id} className="operational-surface rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-700" />
                <p className="text-sm font-semibold text-primary-text">{insight.title}</p>
              </div>
              <Badge variant={severityVariant[insight.severity]}>{insight.severity}</Badge>
            </div>
            <p className="mt-3 text-sm text-secondary-text">{insight.explanation}</p>
            <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-medium text-primary-text">{insight.action}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {insight.evidence.map((item) => (
                <span key={item} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-secondary-text">{item}</span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="operational-surface rounded-lg" aria-labelledby="demand-forecast-heading">
          <div className="border-b border-border p-4">
            <h2 id="demand-forecast-heading" className="flex items-center gap-2 text-sm font-semibold text-primary-text"><TrendingUp className="size-4" /> Demand forecast</h2>
            <p className="mt-1 text-xs text-secondary-text">Explainable 7-day demand and stockout risk.</p>
          </div>
          <div className="divide-y divide-border">
            {topForecasts.length ? topForecasts.map((forecast) => (
              <div key={forecast.productId} className="grid gap-3 p-4 md:grid-cols-[1fr_140px]">
                <div>
                  <p className="font-medium text-primary-text">{forecast.productName}</p>
                  <p className="mt-1 text-sm text-secondary-text">{forecast.explanation}</p>
                  <p className="mt-2 text-xs text-secondary-text">{forecast.confidenceReasoning}</p>
                  <p className="mt-1 text-xs text-secondary-text">{forecast.regionalContext}</p>
                </div>
                <div className="text-sm md:text-right">
                  <p className="font-semibold text-primary-text">{forecast.expectedUnits7d} units</p>
                  <p className="text-secondary-text">{forecast.daysOfCover ?? "New"} days cover</p>
                  <p className="text-secondary-text">{Math.round(forecast.confidence * 100)}% confidence</p>
                  <Badge variant={forecast.stockoutRisk === "high" ? "danger" : forecast.stockoutRisk === "medium" ? "warning" : "secondary"}>{forecast.stockoutRisk} risk</Badge>
                </div>
              </div>
            )) : <EmptyState icon={TrendingUp} title="No demand forecasts yet" description="Forecasts will appear after real products and order signals are ingested." />}
          </div>
        </section>

        <section className="operational-surface rounded-lg" aria-labelledby="inventory-guidance-heading">
          <div className="border-b border-border p-4">
            <h2 id="inventory-guidance-heading" className="flex items-center gap-2 text-sm font-semibold text-primary-text"><Boxes className="size-4" /> Inventory intelligence</h2>
            <p className="mt-1 text-xs text-secondary-text">Reorder guidance, turnover, and dead-stock prevention.</p>
          </div>
          <div className="divide-y divide-border">
            {restock.length ? restock.map((item) => (
              <div key={item.productId} className="grid gap-3 p-4 md:grid-cols-[1fr_150px]">
                <div>
                  <p className="font-medium text-primary-text">{item.productName}</p>
                  <p className="mt-1 text-sm text-secondary-text">{item.rationale}</p>
                </div>
                <div className="text-sm md:text-right">
                  <p className="font-semibold text-primary-text">{item.available} available</p>
                  <p className="text-secondary-text">Restock {item.recommendedRestock}</p>
                  <Badge variant={item.risk === "restock" ? "danger" : "warning"}>{item.risk.replace("_", " ")}</Badge>
                </div>
              </div>
            )) : <EmptyState icon={Boxes} title="No inventory guidance yet" description="Inventory intelligence will appear after verified stock is uploaded." />}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="operational-surface rounded-lg" aria-labelledby="discoverability-heading">
          <div className="border-b border-border p-4">
            <h2 id="discoverability-heading" className="flex items-center gap-2 text-sm font-semibold text-primary-text"><Search className="size-4" /> Discoverability</h2>
          </div>
          <div className="space-y-3 p-4">
            {discoverability.length ? discoverability.map((item) => (
              <div key={item.productId} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-primary-text">{item.productName}</p>
                  <Badge variant={item.visibility === "weak" ? "warning" : "secondary"}>{item.score}/100</Badge>
                </div>
                <p className="mt-2 text-xs text-secondary-text">{item.recommendation}</p>
              </div>
            )) : <EmptyState icon={Search} title="No discoverability signals" description="Search visibility guidance will appear after real catalog items are indexed." />}
          </div>
        </section>

        <section className="operational-surface rounded-lg" aria-labelledby="pricing-heading">
          <div className="border-b border-border p-4">
            <h2 id="pricing-heading" className="flex items-center gap-2 text-sm font-semibold text-primary-text"><Tags className="size-4" /> Pricing guidance</h2>
          </div>
          <div className="space-y-3 p-4">
            {pricing.length ? pricing.map((item) => (
              <div key={item.productId} className="rounded-md border border-border p-3">
                <p className="text-sm font-medium text-primary-text">{item.productName}</p>
                <p className="mt-1 text-xs text-secondary-text">{formatCurrency(item.currentPrice)} · {item.position}</p>
                <p className="mt-2 text-xs text-secondary-text">{item.suggestion}</p>
              </div>
            )) : <EmptyState icon={Tags} title="No pricing guidance yet" description="Pricing signals will appear after verified products and local demand data are available." />}
          </div>
        </section>

        <section className="operational-surface rounded-lg" aria-labelledby="hyperlocal-heading">
          <div className="border-b border-border p-4">
            <h2 id="hyperlocal-heading" className="flex items-center gap-2 text-sm font-semibold text-primary-text"><MapPin className="size-4" /> Hyperlocal market</h2>
          </div>
          <div className="space-y-3 p-4 text-sm">
            <p className="font-medium text-primary-text">{intelligence.hyperlocal.locality}, {intelligence.hyperlocal.city}</p>
            <p className="text-secondary-text">Service radius {intelligence.hyperlocal.serviceRadiusKm} km</p>
            {intelligence.hyperlocal.demandSignals.map((signal) => (
              <p key={signal} className="rounded-md bg-slate-50 p-3 text-secondary-text">{signal}</p>
            ))}
          </div>
        </section>
      </div>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Merchant operating safeguards">
        <div className="operational-surface rounded-lg p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-primary-text"><PackageCheck className="size-4" /> Fulfillment health</h2>
          <p className="mt-3 text-2xl font-semibold text-primary-text">{intelligence.fulfillment.fulfillmentRate}%</p>
          <p className="mt-1 text-sm text-secondary-text">{intelligence.fulfillment.bottlenecks.join(" ")}</p>
        </div>
        <div className="operational-surface rounded-lg p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-primary-text"><Languages className="size-4" /> Localized guidance</h2>
          {localizedGuidance.length ? localizedGuidance.map((item) => <p key={item} className="mt-2 text-sm text-secondary-text">{item}</p>) : <p className="mt-3 text-sm text-secondary-text">Localized seller guidance will appear after live catalog signals are available.</p>}
        </div>
        <div className="operational-surface rounded-lg p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-primary-text"><ShieldCheck className="size-4" /> Fairness guardrail</h2>
          <p className="mt-3 text-sm text-secondary-text">
            {fairnessGuidance}
          </p>
        </div>
      </section>
    </div>
  );
}
