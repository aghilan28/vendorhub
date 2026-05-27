import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertTriangle,
};

export function Alert({
  title,
  children,
  variant = "info",
  className,
}: {
  title: string;
  children?: React.ReactNode;
  variant?: keyof typeof icons;
  className?: string;
}) {
  const Icon = icons[variant];
  return (
    <div
      role={variant === "danger" || variant === "warning" ? "alert" : "status"}
      aria-live={variant === "danger" || variant === "warning" ? "assertive" : "polite"}
      className={cn(
        "flex gap-3 rounded-lg border bg-surface p-4 text-sm shadow-sm",
        variant === "success" && "border-emerald-200",
        variant === "warning" && "border-amber-200",
        variant === "danger" && "border-red-200",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-secondary-text" aria-hidden />
      <div>
        <p className="font-medium text-primary-text">{title}</p>
        {children ? <div className="mt-1 text-secondary-text">{children}</div> : null}
      </div>
    </div>
  );
}
