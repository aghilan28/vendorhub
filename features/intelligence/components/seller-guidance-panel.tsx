"use client";

import { Lightbulb, LineChart, SearchCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { marketplaceProducts } from "@/features/marketplace/lib/data";
import { getSellerDiscoverabilityInsights } from "../marketplace-insights";
import { buildSellerListingGuidance } from "../seller-assistance";
import type { SellerProduct } from "@/features/seller/types";

export function SellerGuidancePanel({ product }: { product: Pick<SellerProduct, "name" | "category" | "price" | "stock" | "lowStockThreshold"> & { description?: string; vendorId?: string } }) {
  const guidance = buildSellerListingGuidance(product);
  const sellerId = product.vendorId ?? marketplaceProducts.find((item) => item.category.name === product.category)?.vendor.id ?? marketplaceProducts[0]?.vendor.id;
  const insights = sellerId ? getSellerDiscoverabilityInsights(marketplaceProducts, sellerId) : null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-primary-text"><Lightbulb className="size-4 text-brand" /> Listing intelligence</h2>
          <p className="mt-1 text-sm text-secondary-text">Practical search and conversion guidance for this catalog item.</p>
        </div>
        <Badge variant={guidance.qualityScore >= 80 ? "default" : "warning"}>{guidance.qualityScore}/100 quality</Badge>
      </div>

      {insights ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-sm font-medium text-primary-text">Search visibility</p>
            <p className="mt-2 text-2xl font-semibold text-primary-text">{insights.searchVisibility}%</p>
            <p className="mt-1 text-xs text-secondary-text">{insights.rankingInsights[0]}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-sm font-medium text-primary-text">Discoverability</p>
            <p className="mt-2 text-2xl font-semibold text-primary-text">{insights.discoverability}/100</p>
            <p className="mt-1 text-xs text-secondary-text">{insights.rankingInsights[1]}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-sm font-medium text-primary-text">Category opportunities</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {insights.categoryOpportunities.map((item) => <Badge key={item.slug} variant="secondary">{item.label}</Badge>)}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-primary-text"><SearchCheck className="size-4" /> Search hints</p>
          <ul className="mt-2 space-y-2 text-xs text-secondary-text">
            {guidance.searchOptimizationHints.slice(0, 3).map((hint) => <li key={hint}>{hint}</li>)}
          </ul>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-sm font-medium text-primary-text">Title options</p>
          <ul className="mt-2 space-y-2 text-xs text-secondary-text">
            {guidance.titleSuggestions.slice(0, 3).map((hint) => <li key={hint}>{hint}</li>)}
          </ul>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-primary-text"><LineChart className="size-4" /> Operational signals</p>
          <ul className="mt-2 space-y-2 text-xs text-secondary-text">
            {guidance.pricingSignals.map((hint) => <li key={hint}>{hint}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
