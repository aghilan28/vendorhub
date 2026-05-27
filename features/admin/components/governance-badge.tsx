import { Badge } from "@/components/ui/badge";
import type { GovernanceTone } from "../types";
import { labelize } from "../utils";

const badgeVariant = {
  success: "default",
  warning: "warning",
  danger: "danger",
  neutral: "secondary",
  info: "ai",
} as const;

export function GovernanceBadge({ label, tone }: { label: string; tone: GovernanceTone }) {
  return <Badge variant={badgeVariant[tone]}>{labelize(label)}</Badge>;
}
