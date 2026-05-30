"use client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { useSellerIntelligence } from "@/features/seller/queries";
import { EmptyState, IntelPageHeader, IntelSection, LoadingState, StatusPill } from "./primitives";

export function InventoryIntelligenceScreen() {
  const { data: intel, isLoading } = useSellerIntelligence();
  if (isLoading) return <LoadingState />;
  if (!intel || intel.inventory.length === 0) {
    return <EmptyState title="No inventory intelligence yet" hint="Stock risk and reorder recommendations are generated from your inventory and demand signals." />;
  }

  const items = intel.inventory;
  const restock = items.filter((i) => i.risk === "restock");
  const dead = items.filter((i) => i.risk === "dead_stock");
  const healthy = items.filter((i) => i.risk === "healthy");
  const reorderUnits = items.reduce((sum, i) => sum + i.recommendedRestock, 0);

  return (
    <div className="space-y-6">
      <IntelPageHeader eyebrow="Inventory Intelligence" title="Stock risk & reorder" subtitle="Inventory health, stock risk, and reorder recommendations derived from availability, reservations, and demand." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Healthy SKUs" value={String(healthy.length)} />
        <MetricCard label="Needs restock" value={String(restock.length)} />
        <MetricCard label="Dead stock" value={String(dead.length)} />
        <MetricCard label="Recommended reorder (units)" value={String(reorderUnits)} />
      </div>

      {restock.length > 0 ? (
        <IntelSection title="Reorder recommendations" description="Products below reorder point.">
          <ul className="space-y-2">
            {restock.map((i) => (
              <li key={i.productId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium text-primary-text">{i.productName}</p>
                  <p className="text-xs text-secondary-text">{i.rationale}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary-text">+{i.recommendedRestock} units</p>
                  <p className="text-xs text-secondary-text">avail {i.available} · reserved {i.reserved} · reorder @ {i.reorderPoint}</p>
                </div>
              </li>
            ))}
          </ul>
        </IntelSection>
      ) : null}

      <IntelSection title="Inventory health" description={`${items.length} products tracked.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-secondary-text">
                <th className="py-2 pr-3 font-medium">Product</th>
                <th className="py-2 pr-3 font-medium">Available</th>
                <th className="py-2 pr-3 font-medium">Reserved</th>
                <th className="py-2 pr-3 font-medium">Reorder pt</th>
                <th className="py-2 pr-3 font-medium">Turnover</th>
                <th className="py-2 pr-3 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.productId} className="border-b border-border/40">
                  <td className="py-2 pr-3 font-medium text-primary-text">{i.productName}</td>
                  <td className="py-2 pr-3">{i.available}</td>
                  <td className="py-2 pr-3">{i.reserved}</td>
                  <td className="py-2 pr-3">{i.reorderPoint}</td>
                  <td className="py-2 pr-3"><StatusPill value={i.turnoverSignal} /></td>
                  <td className="py-2 pr-3"><StatusPill value={i.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </IntelSection>
    </div>
  );
}
