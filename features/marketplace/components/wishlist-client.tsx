"use client";

import { ProductGrid } from "@/components/commerce/product-grid";
import type { Product } from "@/types";

export function WishlistClient({ products }: { products: Product[] }) {
  if (!products.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center">
        <h2 className="text-xl font-semibold text-primary-text">No saved products yet</h2>
        <p className="mt-2 text-sm text-secondary-text">Save frequently ordered items and compare seller availability later.</p>
      </div>
    );
  }

  return <ProductGrid products={products} />;
}
