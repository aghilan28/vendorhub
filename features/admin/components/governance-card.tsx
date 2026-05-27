import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GovernanceCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("operational-surface rounded-lg", className)}>
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-primary-text">{title}</h2>
          {description ? <p className="mt-1 text-xs text-secondary-text">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
