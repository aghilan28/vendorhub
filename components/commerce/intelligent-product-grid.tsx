"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistance } from "@/lib/geo";
import { useIntelligenceStore } from "@/store/intelligence-store";
import { ProductCard } from "./product-card";
import type { RankedProduct } from "@/features/intelligence/types";

export function IntelligentProductGrid({ products }: { products: RankedProduct[] }) {
  const recordEvent = useIntelligenceStore((state) => state.recordEvent);

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 min-[390px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((item) => (
        <div key={item.product.id} className="space-y-2">
          <div onClick={() => recordEvent({ type: "product_click", productId: item.product.id, categorySlug: item.product.category.slug, source: "adaptive_search" })}>
            <ProductCard product={item.product} />
          </div>
          <div className="rounded-md border border-border bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{Math.round(item.score * 100)} match</Badge>
              {typeof item.distanceKm === "number" ? <Badge variant="default">{formatDistance(item.distanceKm)}</Badge> : null}
              {item.deliveryStatus ? <Badge variant={item.deliveryStatus === "outside_radius" ? "warning" : "secondary"}>{item.deliveryStatus.replace("_", " ")}</Badge> : null}
              <span className="min-w-0 text-xs font-medium text-secondary-text">{item.reason}</span>
            </div>
            {item.explanations?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.explanations.slice(0, 3).map((signal) => (
                  <Badge key={signal} variant="secondary">{signal}</Badge>
                ))}
              </div>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-7 px-2 text-xs"
              onClick={() => recordEvent({ type: "recommendation_interaction", productId: item.product.id, categorySlug: item.product.category.slug, source: "ranking_feedback" })}
            >
              Relevant
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
