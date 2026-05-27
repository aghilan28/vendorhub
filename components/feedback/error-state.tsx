import { AlertTriangle } from "lucide-react";
import { EmptyState } from "./empty-state";

export function ErrorState({
  title = "This surface recovered safely",
  description = "VendorHub preserved the shell and fallback data. Retry the view or continue through the available recovery path.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={description}
      actionLabel="Retry"
    />
  );
}
