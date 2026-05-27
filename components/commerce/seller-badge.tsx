import { Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SellerBadge({ name, status }: { name: string; status: "open" | "busy" | "closed" | "paused" }) {
  return (
    <Badge className="min-w-0 max-w-[9rem]" variant={status === "open" ? "default" : status === "busy" ? "warning" : "secondary"}>
      <Store className="size-3 shrink-0" /> <span className="truncate">{name}</span>
    </Badge>
  );
}
