"use client";

import { ProductGrid } from "@/components/commerce/product-grid";
import { SearchSkeleton } from "@/components/feedback/search-skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { Sparkles } from "lucide-react";
import type { Product } from "@/types";
import { useHomepageRecommendations, useRelatedProducts } from "../queries";

export function HomepageRecommendationStrip({ products }: { products?: Product[] }) {
  const { data = [], isLoading } = useHomepageRecommendations(products);
  if (isLoading) return <SearchSkeleton />;
  if (!data.length) return <EmptyState icon={Sparkles} title="No recommendations yet" description="Recommendation graphs are empty until verified real catalog data is ingested." />;

  return <ProductGrid products={data.map((item) => item.product)} />;
}

export function RelatedProductStrip({ productId, products }: { productId: string; products?: Product[] }) {
  const { data = [], isLoading } = useRelatedProducts(productId, products);
  if (isLoading) return <SearchSkeleton />;
  if (!data.length) return <EmptyState icon={Sparkles} title="No related products yet" description="Related products will appear after real catalog and purchase signals are available." />;

  return <ProductGrid products={data.map((item) => item.product)} />;
}
