import { Badge } from "@/components/ui/badge";
import { OrderStatus } from "@/types";
import { orderStatusLabels } from "@/features/transactions/lifecycle";

const labels: Record<OrderStatus, string> = {
  ...orderStatusLabels,
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  const variant =
    status === OrderStatus.Cancelled || status === OrderStatus.Refunded
      ? "danger"
      : status === OrderStatus.Pending
        ? "warning"
        : "default";
  return <Badge variant={variant}>{labels[status]}</Badge>;
}
