import type { ObservabilityDomain } from "@/lib/observability/types";
import type { AsyncJobCategory } from "./types";

export function domainForAsyncCategory(category: AsyncJobCategory): ObservabilityDomain {
  if (category === "governance" || category === "notification" || category === "analytics") return "admin";
  return category;
}

