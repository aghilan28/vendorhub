import { ProductCard } from "./product-card";
import type { RankedProduct } from "@/features/intelligence/types";

export function IntelligentProductGrid({ products }: { products: RankedProduct[] }) {
  return (
    <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {products.map((item) => (
        <ProductCard key={item.product.id} product={item.product} />
      ))}
    </div>
  );
}
