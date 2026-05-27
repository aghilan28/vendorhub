import { Badge } from "@/components/ui/badge";
import { PaymentStatus } from "@/types";
import { describePaymentStatus } from "../lifecycle";

export function PaymentStateIndicator({ status }: { status: PaymentStatus }) {
  const variant =
    status === PaymentStatus.Succeeded
      ? "default"
      : status === PaymentStatus.Failed || status === PaymentStatus.Cancelled
        ? "danger"
        : "warning";

  return <Badge variant={variant}>{describePaymentStatus(status)}</Badge>;
}
