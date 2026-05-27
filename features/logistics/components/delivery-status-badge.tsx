import { Badge } from "@/components/ui/badge";
import { deliveryStatusLabels, deliveryStatusTone } from "../status-engine";
import type { DeliveryStatus } from "../types";

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const tone = deliveryStatusTone(status);
  const variant = tone === "danger" || tone === "warning" ? "warning" : tone === "success" ? "default" : "secondary";
  return <Badge variant={variant}>{deliveryStatusLabels[status]}</Badge>;
}
