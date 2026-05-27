import { ProductCard } from "./product-card";
import type { RankedProduct } from "@/features/intelligence/types";

export function IntelligentProductGrid({ products }: { products: RankedProduct[] }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 min-[390px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((item) => (
        <ProductCard key={item.product.id} product={item.product} />
      ))}
    </div>
  );
}
