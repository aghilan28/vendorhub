"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, History, Minus, Plus, Save } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchJson } from "@/lib/api/client";
import { useSellerInventory } from "../queries";
import { useSellerStore } from "../store";
import type { InventoryItem } from "../types";
import { inventoryStatus } from "../utils";
import { SellerTableSkeleton } from "./loading";
import { OperationalTable, type OperationalColumn } from "./operational-table";
import { StatusBadge } from "./status-badge";

export function InventoryScreen() {
  const { data = [], isLoading } = useSellerInventory();
  const queryClient = useQueryClient();
  const [draftStock, setDraftStock] = useState<Record<string, number>>({});
  const search = useSellerStore((state) => state.inventorySearch);
  const setSearch = useSellerStore((state) => state.setInventorySearch);
  const filter = useSellerStore((state) => state.inventoryFilter);
  const setFilter = useSellerStore((state) => state.setInventoryFilter);
  const rows = data.filter((item) => {
    const matchesSearch = [item.name, item.sku, item.aisle, item.batch].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || inventoryStatus(item) === filter;
    return matchesSearch && matchesFilter;
  });

  const stockMutation = useMutation({
    mutationFn: (input: { inventoryId: string; stockQuantity: number; reason: string }) =>
      fetchJson("/api/seller/inventory", { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["seller"] });
    },
  });

  function updateDraft(item: InventoryItem, stockQuantity: number) {
    if (item.inventoryId) setDraftStock((current) => ({ ...current, [item.inventoryId as string]: Math.max(0, stockQuantity) }));
  }

  function saveStock(item: InventoryItem) {
    if (!item.inventoryId) return;
    stockMutation.mutate({
      inventoryId: item.inventoryId,
      stockQuantity: draftStock[item.inventoryId] ?? item.stock,
      reason: "seller_live_inventory_adjustment",
    });
  }

  if (isLoading) return <SellerTableSkeleton />;

  const columns: OperationalColumn<InventoryItem>[] = [
    { key: "sku", header: "SKU", render: (item) => <div><p className="font-medium text-primary-text">{item.sku}</p><p className="text-xs text-secondary-text">{item.name}</p></div> },
    { key: "status", header: "Stock status", render: (item) => <StatusBadge status={inventoryStatus(item)} /> },
    { key: "quantity", header: "Quantity", sortLabel: "Sort quantity", render: (item) => (
      <div className="flex max-w-56 items-center gap-1">
        <Button size="icon" variant="secondary" aria-label={`Decrease stock for ${item.name}`} onClick={() => updateDraft(item, (draftStock[item.inventoryId ?? ""] ?? item.stock) - 1)}><Minus /></Button>
        <Input type="number" value={draftStock[item.inventoryId ?? ""] ?? item.stock} onChange={(event) => updateDraft(item, Number(event.target.value))} aria-label={`Stock for ${item.name}`} className="h-10 text-center" />
        <Button size="icon" variant="secondary" aria-label={`Increase stock for ${item.name}`} onClick={() => updateDraft(item, (draftStock[item.inventoryId ?? ""] ?? item.stock) + 1)}><Plus /></Button>
        <Button size="icon" variant="secondary" aria-label="Save stock" onClick={() => saveStock(item)} disabled={!item.inventoryId || stockMutation.isPending}><Save /></Button>
      </div>
    ) },
    { key: "reserved", header: "Reserved", render: (item) => `${item.reserved} units` },
    { key: "location", header: "Location", render: (item) => <div><p>{item.aisle}</p><p className="text-xs text-secondary-text">Batch {item.batch}</p></div> },
    { key: "expiry", header: "Expiry", render: (item) => item.expiry },
    { key: "movement", header: "Movement placeholder", render: (item) => <div className="max-w-64 text-sm text-secondary-text">{item.lastMovement}</div> },
  ];

  return (
    <OperationalTable
      title="Inventory management"
      description="Reliable stock control with low-stock indicators, reserved stock placeholders, and movement-ready architecture."
      rows={rows}
      columns={columns}
      searchValue={search}
      onSearch={setSearch}
      empty={<EmptyState icon={ClipboardList} title="No inventory records found" description="Inventory filters returned no operational records." />}
      actions={
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stock</SelectItem>
              <SelectItem value="low_stock">Low stock</SelectItem>
              <SelectItem value="out_of_stock">Out of stock</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary"><History /> Movements</Button>
        </div>
      }
    />
  );
}
