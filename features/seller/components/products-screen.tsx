"use client";

import Link from "next/link";
import { Archive, Copy, Lightbulb, PackagePlus, Plus } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatting/currency";
import { SellerGuidancePanel } from "@/features/intelligence/components/seller-guidance-panel";
import { useSellerProducts } from "../queries";
import { useSellerStore } from "../store";
import type { SellerProduct } from "../types";
import { inventoryStatus } from "../utils";
import { OperationalTable, type OperationalColumn } from "./operational-table";
import { SellerTableSkeleton } from "./loading";
import { StatusBadge } from "./status-badge";

export function ProductsScreen() {
  const { data = [], isLoading } = useSellerProducts();
  const search = useSellerStore((state) => state.productSearch);
  const setSearch = useSellerStore((state) => state.setProductSearch);
  const rows = data.filter((product) => [product.name, product.sku, product.category].join(" ").toLowerCase().includes(search.toLowerCase()));

  if (isLoading) return <SellerTableSkeleton />;

  const columns: OperationalColumn<SellerProduct>[] = [
    {
      key: "product",
      header: "Product",
      sortLabel: "Sort product",
      render: (product) => (
        <Link href={`/seller/products/${product.id}`} className="block rounded-sm focus-ring">
          <p className="font-medium text-primary-text">{product.name}</p>
          <p className="mt-1 text-xs text-secondary-text">{product.sku}</p>
        </Link>
      ),
    },
    { key: "category", header: "Category", render: (product) => product.category },
    { key: "price", header: "Price", sortLabel: "Sort price", render: (product) => formatCurrency(product.price) },
    { key: "status", header: "Status", render: (product) => <StatusBadge status={product.status} /> },
    { key: "stock", header: "Inventory", sortLabel: "Sort stock", render: (product) => <div><StatusBadge status={inventoryStatus(product)} /><p className="mt-1 text-xs text-secondary-text">{product.stock} available · {product.reserved} reserved</p></div> },
    {
      key: "actions",
      header: "Actions",
      render: () => (
        <div className="flex gap-2">
          <Button size="icon" variant="secondary" aria-label="Duplicate product"><Copy /></Button>
          <Button size="icon" variant="ghost" aria-label="Archive product"><Archive /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {data[0] ? (
        <SellerGuidancePanel product={{ ...data[0], description: "Seller catalog item ready for listing quality guidance." }} />
      ) : (
        <EmptyState
          icon={Lightbulb}
          title="Listing intelligence ready"
          description="Search, pricing, and conversion guidance will appear after the first real catalog item is created."
        />
      )}
      <OperationalTable
        title="Product management"
        description="Catalog table with search, statuses, listing quality context, duplication, and archive actions."
        rows={rows}
        columns={columns}
        searchValue={search}
        onSearch={setSearch}
        empty={<EmptyState icon={PackagePlus} title="No products match this search" description="Create or adjust product filters to keep the catalog operational." actionLabel="Create product" />}
        actions={<Button asChild><Link href="/seller/products/new"><Plus /> New product</Link></Button>}
      />
    </div>
  );
}
