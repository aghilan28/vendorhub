import type { Product } from "@/types";
import { EmptyState } from "@/components/feedback/empty-state";
import { PackageSearch } from "lucide-react";
import { ProductCard } from "./product-card";

export function ProductGrid({ products, compact = false }: { products: Product[]; compact?: boolean }) {
  if (!products.length) {
    return <EmptyState icon={PackageSearch} title="No products listed" description="The marketplace catalog is ready for verified real product ingestion." />;
  }

  return (
    <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} compact={compact} />
      ))}
    </div>
  );
}
