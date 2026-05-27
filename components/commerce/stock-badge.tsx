import { Badge } from "@/components/ui/badge";

export function StockBadge({ count }: { count: number }) {
  if (count <= 0) return <Badge variant="danger">Unavailable</Badge>;
  if (count < 5) return <Badge variant="warning">Low stock</Badge>;
  return <Badge variant="default">In stock</Badge>;
}
