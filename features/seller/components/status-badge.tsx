import { Badge } from "@/components/ui/badge";
import type { InventoryStatus, ProductStatus, SellerOrderStatus } from "../types";
import { statusLabel, toneForInventory, toneForOrder } from "../utils";

export function StatusBadge({ status }: { status: SellerOrderStatus | ProductStatus | InventoryStatus }) {
  if (status === "draft") return <Badge variant="warning">Draft</Badge>;
  if (status === "published") return <Badge>Published</Badge>;
  if (status === "archived") return <Badge variant="secondary">Archived</Badge>;
  if (status === "in_stock" || status === "low_stock" || status === "out_of_stock") {
    return <Badge variant={toneForInventory(status)}>{statusLabel(status)}</Badge>;
  }
  return <Badge variant={toneForOrder(status)}>{statusLabel(status)}</Badge>;
}
