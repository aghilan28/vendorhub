"use client";

import { Badge } from "@/components/ui/badge";
import { ProductGrid } from "@/components/commerce/product-grid";
import { SearchSkeleton } from "@/components/feedback/search-skeleton";
import type { Product } from "@/types";
import { useHomepageRecommendations, useRelatedProducts } from "../queries";

export function HomepageRecommendationStrip({ products }: { products?: Product[] }) {
  const { data = [], isLoading } = useHomepageRecommendations(products);
  if (isLoading) return <SearchSkeleton />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {data.slice(0, 3).map((item) => (
          <Badge key={item.product.id} variant="secondary">{item.source.replace("_", " ")} · {Math.round(item.score * 100)}%</Badge>
        ))}
      </div>
      <ProductGrid products={data.map((item) => item.product)} />
    </div>
  );
}

export function RelatedProductStrip({ productId, products }: { productId: string; products?: Product[] }) {
  const { data = [], isLoading } = useRelatedProducts(productId, products);
  if (isLoading) return <SearchSkeleton />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {data.slice(0, 3).map((item) => (
          <Badge key={item.product.id} variant="secondary">{item.reason}</Badge>
        ))}
      </div>
      <ProductGrid products={data.map((item) => item.product)} />
    </div>
  );
}
