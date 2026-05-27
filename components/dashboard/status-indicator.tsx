import { cn } from "@/lib/utils";

export function StatusIndicator({ label, tone = "success" }: { label: string; tone?: "success" | "warning" | "danger" | "neutral" }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-secondary-text">
      <span
        className={cn(
          "size-2 rounded-full",
          tone === "success" && "bg-success",
          tone === "warning" && "bg-warning",
          tone === "danger" && "bg-danger",
          tone === "neutral" && "bg-slate-300",
        )}
      />
      {label}
    </span>
  );
}
