import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  delta,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  delta?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("operational-surface rounded-lg p-4", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-secondary-text">{label}</p>
        {Icon ? <Icon className="size-4 text-secondary-text" /> : null}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="metric-value">{value}</p>
        {delta ? (
          <Badge variant="default">
            <ArrowUpRight className="size-3" /> {delta}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
