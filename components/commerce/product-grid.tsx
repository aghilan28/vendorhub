import type { Product } from "@/types";
import { ProductCard } from "./product-card";

export function ProductGrid({ products, compact = false }: { products: Product[]; compact?: boolean }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} compact={compact} />
      ))}
    </div>
  );
}
