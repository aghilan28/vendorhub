"use client";

import { ProductGrid } from "@/components/commerce/product-grid";
import { SearchSkeleton } from "@/components/feedback/search-skeleton";
import type { Product } from "@/types";
import { useHomepageRecommendations, useRelatedProducts } from "../queries";

export function HomepageRecommendationStrip({ products }: { products?: Product[] }) {
  const { data = [], isLoading } = useHomepageRecommendations(products);
  if (isLoading) return <SearchSkeleton />;

  return <ProductGrid products={data.map((item) => item.product)} />;
}

export function RelatedProductStrip({ productId, products }: { productId: string; products?: Product[] }) {
  const { data = [], isLoading } = useRelatedProducts(productId, products);
  if (isLoading) return <SearchSkeleton />;

  return <ProductGrid products={data.map((item) => item.product)} />;
}
