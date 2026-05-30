"use client";

import { useMemo, useState } from "react";
import { useSellerIntelligence } from "@/features/seller/queries";
import type { DemandForecast, PricingGuidance } from "@/features/merchant-intelligence";
import { EmptyState, IntelPageHeader, IntelSection, LoadingState, StatusPill } from "./primitives";

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

export function PricingStudioScreen() {
  const { data: intel, isLoading } = useSellerIntelligence();
  if (isLoading) return <LoadingState />;
  if (!intel || intel.pricing.length === 0) {
    return <EmptyState title="No pricing guidance yet" hint="Pricing guidance is generated from your catalog and demand signals. Add products to populate this studio." />;
  }

  return (
    <div className="space-y-6">
      <IntelPageHeader eyebrow="Pricing Studio" title="Pricing positioning" subtitle="Engine-generated price positioning and guardrails for every product, derived from demand and catalog signals." />
      <IntelSection title="Price guidance" description={`${intel.pricing.length} products evaluated.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-secondary-text">
                <th className="py-2 pr-3 font-medium">Product</th>
                <th className="py-2 pr-3 font-medium">Current</th>
                <th className="py-2 pr-3 font-medium">Position</th>
                <th className="py-2 pr-3 font-medium">Suggestion</th>
                <th className="py-2 pr-3 font-medium">Guardrail</th>
              </tr>
            </thead>
            <tbody>
              {intel.pricing.map((p: PricingGuidance) => (
                <tr key={p.productId} className="border-b border-border/40 align-top">
                  <td className="py-2 pr-3 font-medium text-primary-text">{p.productName}</td>
                  <td className="py-2 pr-3">{inr(p.currentPrice)}</td>
                  <td className="py-2 pr-3"><StatusPill value={p.position} /></td>
                  <td className="py-2 pr-3 text-secondary-text">{p.suggestion}</td>
                  <td className="py-2 pr-3 text-secondary-text">{p.guardrail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </IntelSection>
    </div>
  );
}

type Decision = "pending" | "approved" | "dismissed";

export function PricingRecommendationsScreen() {
  const { data: intel, isLoading } = useSellerIntelligence();
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  if (isLoading) return <LoadingState />;
  if (!intel || intel.pricing.length === 0) {
    return <EmptyState title="No pricing recommendations" hint="Recommendations appear once the pricing engine detects positioning opportunities." />;
  }

  const actionable = intel.pricing.filter((p) => p.position === "review" || p.position === "premium" || p.position === "value");

  return (
    <div className="space-y-6">
      <IntelPageHeader eyebrow="Pricing Studio" title="Pricing recommendations" subtitle="Review engine recommendations and stage a decision. Decisions are staged in this session; persistence to an approval ledger is a backend follow-up." />
      <IntelSection title="Recommendations" description={`${actionable.length} actionable of ${intel.pricing.length} products.`}>
        <ul className="space-y-3">
          {actionable.map((p) => {
            const state = decisions[p.productId] ?? "pending";
            return (
              <li key={p.productId} className="rounded-md border border-border/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-primary-text">{p.productName}</p>
                    <p className="text-xs text-secondary-text">Current {inr(p.currentPrice)} · <StatusPill value={p.position} /></p>
                  </div>
                  {state === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDecisions((d) => ({ ...d, [p.productId]: "approved" }))}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecisions((d) => ({ ...d, [p.productId]: "dismissed" }))}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium text-secondary-text"
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : (
                    <StatusPill value={state === "approved" ? "balanced" : "review"} className="capitalize" />
                  )}
                </div>
                <p className="mt-2 text-sm text-secondary-text">{p.suggestion}</p>
                <p className="mt-1 text-xs text-secondary-text">Guardrail: {p.guardrail}</p>
                {state !== "pending" ? <p className="mt-2 text-xs font-medium text-primary-text">Decision: {state}</p> : null}
              </li>
            );
          })}
        </ul>
      </IntelSection>
    </div>
  );
}

export function PricingSimulatorScreen() {
  const { data: intel, isLoading } = useSellerIntelligence();
  const products = useMemo(() => intel?.pricing ?? [], [intel]);
  const [productId, setProductId] = useState<string>("");
  const [priceInput, setPriceInput] = useState<string>("");
  const [costInput, setCostInput] = useState<string>("");

  const selected = useMemo(() => products.find((p) => p.productId === productId) ?? products[0], [products, productId]);
  const forecast: DemandForecast | undefined = useMemo(
    () => intel?.forecasts.find((f) => f.productId === selected?.productId),
    [intel, selected],
  );

  if (isLoading) return <LoadingState />;
  if (!intel || products.length === 0) {
    return <EmptyState title="Nothing to simulate yet" hint="Add products to use the price simulator." />;
  }

  const current = selected?.currentPrice ?? 0;
  const newPrice = Number(priceInput) || current;
  const cost = Number(costInput) || 0;
  const units7d = forecast?.expectedUnits7d ?? Math.round((forecast?.dailyRunRate ?? 0) * 7);
  const marginPct = newPrice > 0 ? ((newPrice - cost) / newPrice) * 100 : 0;
  const projectedRevenue = newPrice * units7d;
  const projectedProfit = (newPrice - cost) * units7d;
  const baselineRevenue = current * units7d;
  const revenueDelta = projectedRevenue - baselineRevenue;

  return (
    <div className="space-y-6">
      <IntelPageHeader eyebrow="Pricing Studio" title="Price simulator" subtitle="Model the 7-day revenue and margin impact of a price change using the product's demand forecast." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IntelSection title="Inputs">
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="text-secondary-text">Product</span>
              <select
                value={selected?.productId ?? ""}
                onChange={(e) => setProductId(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
              >
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>{p.productName}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-secondary-text">New price (₹) — current {inr(current)}</span>
              <input inputMode="numeric" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} placeholder={String(current)} className="mt-1 w-full rounded-md border bg-background px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-secondary-text">Unit cost (₹)</span>
              <input inputMode="numeric" value={costInput} onChange={(e) => setCostInput(e.target.value)} placeholder="0" className="mt-1 w-full rounded-md border bg-background px-3 py-2" />
            </label>
            <p className="text-xs text-secondary-text">Projected demand: {units7d} units / 7d {forecast ? `(${forecast.stockoutRisk} stockout risk)` : "(no forecast — using 0)"}</p>
          </div>
        </IntelSection>

        <IntelSection title="Projected impact (7 days)">
          <dl className="grid grid-cols-2 gap-3">
            <div className="operational-surface rounded-lg p-4">
              <dt className="text-sm text-secondary-text">Gross margin</dt>
              <dd className="metric-value">{marginPct.toFixed(1)}%</dd>
            </div>
            <div className="operational-surface rounded-lg p-4">
              <dt className="text-sm text-secondary-text">Projected revenue</dt>
              <dd className="metric-value">{inr(projectedRevenue)}</dd>
            </div>
            <div className="operational-surface rounded-lg p-4">
              <dt className="text-sm text-secondary-text">Projected profit</dt>
              <dd className="metric-value">{inr(projectedProfit)}</dd>
            </div>
            <div className="operational-surface rounded-lg p-4">
              <dt className="text-sm text-secondary-text">Revenue vs current</dt>
              <dd className={`metric-value ${revenueDelta >= 0 ? "text-emerald-600" : "text-red-600"}`}>{revenueDelta >= 0 ? "+" : ""}{inr(revenueDelta)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-secondary-text">Estimates assume current demand holds. Elasticity modeling is a documented follow-up; this simulator uses the engine&apos;s demand forecast as the volume basis.</p>
        </IntelSection>
      </div>
    </div>
  );
}
