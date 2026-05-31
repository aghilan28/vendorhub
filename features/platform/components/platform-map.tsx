"use client";

// KARTEX Phase N.2 — Platform Map
// Visual map of the platform: the six-stage intelligence flow, the two
// cross-cutting fabric layers, and the dependency relationships.

import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPlatformModel } from "@/lib/platform";
import { accent, AccentIcon, Icon } from "./shared";

export function PlatformMap() {
  const { subsystems } = getPlatformModel();
  const flow = subsystems
    .filter((s) => s.layerKind === "flow")
    .sort((a, b) => (a.flowOrder ?? 0) - (b.flowOrder ?? 0));
  const fabric = subsystems.filter((s) => s.layerKind === "fabric");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary-text">
          Intelligence flow
        </h2>
        <p className="mt-1 text-sm text-secondary-text">
          Signals enter on the left and become measured outcomes on the right. Each stage feeds the next.
        </p>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-stretch">
          {flow.map((subsystem, index) => {
            const a = accent(subsystem.accent);
            return (
              <div key={subsystem.id} className="flex flex-1 items-stretch gap-3">
                <div className={cn("relative flex-1 rounded-xl border border-border bg-surface p-4 shadow-sm")}>
                  <span className={cn("absolute inset-x-0 top-0 h-1 rounded-t-xl", a.dot)} />
                  <div className="flex items-center gap-3">
                    <AccentIcon name={subsystem.icon} theme={subsystem.accent} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-secondary-text">{subsystem.phase}</p>
                      <p className="truncate text-sm font-semibold text-primary-text">{subsystem.name}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-secondary-text">{subsystem.tagline}</p>
                  {subsystem.route ? (
                    <Link
                      href={subsystem.route}
                      className={cn("mt-3 inline-flex items-center gap-1 text-xs font-medium focus-ring", a.text)}
                    >
                      Open <ExternalLink className="size-3" />
                    </Link>
                  ) : null}
                </div>
                {index < flow.length - 1 ? (
                  <div className="hidden items-center lg:flex">
                    <ArrowRight className="size-5 text-slate-300" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary-text">
          Cross-cutting fabric
        </h2>
        <p className="mt-1 text-sm text-secondary-text">
          Two layers wrap the flow: one connects the subsystems, one lets people operate them.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {fabric.map((subsystem) => (
            <div key={subsystem.id} className="rounded-xl border border-dashed border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <AccentIcon name={subsystem.icon} theme={subsystem.accent} />
                <div>
                  <p className="text-xs font-medium text-secondary-text">{subsystem.phase}</p>
                  <p className="text-sm font-semibold text-primary-text">{subsystem.name}</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-secondary-text">{subsystem.what}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary-text">Dependencies</h2>
        <p className="mt-1 text-sm text-secondary-text">What each subsystem relies on to do its job.</p>
        <ul className="mt-4 space-y-2">
          {subsystems.map((subsystem) => (
            <li
              key={subsystem.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3 text-sm shadow-sm"
            >
              <span className="inline-flex items-center gap-2 font-medium text-primary-text">
                <Icon name={subsystem.icon} className={cn("size-4", accent(subsystem.accent).text)} />
                {subsystem.name}
              </span>
              {subsystem.dependsOn.length > 0 ? (
                <>
                  <span className="text-secondary-text">depends on</span>
                  {subsystem.dependsOn.map((depId) => {
                    const dep = subsystems.find((s) => s.id === depId);
                    if (!dep) return null;
                    return (
                      <span
                        key={depId}
                        className={cn("rounded-full px-2 py-0.5 text-xs font-medium", accent(dep.accent).chip)}
                      >
                        {dep.name}
                      </span>
                    );
                  })}
                </>
              ) : (
                <span className="text-xs text-secondary-text">— entry point (no upstream dependency)</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
