import { cn } from "@/lib/utils";

export function AnalyticsCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("operational-surface rounded-lg p-4", className)}>
      <h2 className="text-sm font-semibold text-primary-text">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
