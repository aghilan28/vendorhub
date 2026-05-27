import { Activity, AlertTriangle, CheckCircle2, Info, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { assessExperiencePosture, experienceToneLabel, type ExperienceInput, type ExperiencePosture } from "@/lib/experience";
import { cn } from "@/lib/utils";

const toneClasses = {
  healthy: "border-emerald-200 bg-emerald-50",
  watch: "border-sky-200 bg-sky-50",
  degraded: "border-amber-200 bg-amber-50",
  critical: "border-red-200 bg-red-50",
} as const;

const toneIcons = {
  healthy: CheckCircle2,
  watch: Info,
  degraded: AlertTriangle,
  critical: AlertTriangle,
} as const;

export function ProductionExperiencePanel({
  input,
  posture,
  compact = false,
  className,
}: {
  input?: ExperienceInput;
  posture?: ExperiencePosture;
  compact?: boolean;
  className?: string;
}) {
  const resolved = posture ?? assessExperiencePosture(input ?? { persona: "buyer" });
  const Icon = toneIcons[resolved.tone];

  return (
    <section
      className={cn("rounded-lg border p-4 shadow-sm", toneClasses[resolved.tone], className)}
      aria-label={`${resolved.title} production experience posture`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Icon className="size-4 shrink-0 text-secondary-text" aria-hidden />
            <h2 className="text-sm font-semibold text-primary-text">{resolved.title}</h2>
            <Badge variant={resolved.tone === "healthy" ? "default" : resolved.tone === "critical" ? "danger" : "warning"}>
              {experienceToneLabel(resolved.tone)}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-secondary-text">{resolved.summary}</p>
          <p className="mt-1 text-xs font-medium text-secondary-text">{resolved.userMessage}</p>
        </div>
        {!compact ? (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {resolved.guarantees.map((guarantee) => (
              <span key={guarantee} className="inline-flex items-center gap-1 rounded-md border border-white/70 bg-white/70 px-2 py-1 text-xs font-medium text-primary-text">
                <ShieldCheck className="size-3 text-brand" aria-hidden />
                {guarantee}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {!compact ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {resolved.signals.map((signal) => (
            <article key={signal.id} className="rounded-md border border-white/70 bg-white/80 p-3">
              <div className="flex items-start gap-2">
                <Activity className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
                <div>
                  <h3 className="text-sm font-medium text-primary-text">{signal.label}</h3>
                  <p className="mt-1 text-xs leading-5 text-secondary-text">{signal.detail}</p>
                  {signal.userAction ? <p className="mt-2 text-xs font-medium text-primary-text">{signal.userAction}</p> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
