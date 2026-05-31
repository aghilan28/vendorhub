"use client";

// KARTEX Phase N.6 — Value Explanation Center
// For every subsystem: what it is, why it exists, what problem it solves, what
// value it creates, and who benefits.

import { cn } from "@/lib/utils";
import { getPlatformModel } from "@/lib/platform";
import { accent, AccentIcon } from "./shared";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary-text">{label}</p>
      <p className="mt-1 text-sm leading-6 text-primary-text">{children}</p>
    </div>
  );
}

export function ValueExplanation() {
  const { subsystems } = getPlatformModel();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {subsystems.map((subsystem) => {
        const a = accent(subsystem.accent);
        return (
          <article key={subsystem.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <div className="flex items-center gap-3 border-b border-border p-4">
              <AccentIcon name={subsystem.icon} theme={subsystem.accent} />
              <div>
                <p className="text-xs font-medium text-secondary-text">
                  {subsystem.phase} · {subsystem.layerKind === "flow" ? "Intelligence stage" : "Platform fabric"}
                </p>
                <h3 className="text-base font-semibold text-primary-text">{subsystem.name}</h3>
              </div>
            </div>
            <div className="space-y-4 p-4">
              <Field label="What it is">{subsystem.what}</Field>
              <Field label="Why it exists">{subsystem.why}</Field>
              <Field label="Problem it solves">{subsystem.problem}</Field>
              <Field label="Value it creates">{subsystem.value}</Field>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary-text">Who benefits</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {subsystem.beneficiaries.map((person) => (
                    <span key={person} className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", a.chip)}>
                      {person}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
