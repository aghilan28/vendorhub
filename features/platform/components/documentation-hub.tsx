"use client";

// KARTEX Phase N.10 — Platform Documentation Hub
// Architecture, capabilities, workflows, integrations and guides, in-app.

import { getPlatformModel } from "@/lib/platform";
import { Icon } from "./shared";

export function DocumentationHub() {
  const { docs } = getPlatformModel();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {docs.map((section) => (
        <section key={section.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-secondary-text">
              <Icon name={section.icon} className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-primary-text">{section.title}</h3>
              <p className="text-xs text-secondary-text">{section.summary}</p>
            </div>
          </div>
          <dl className="mt-4 space-y-3">
            {section.items.map((item) => (
              <div key={item.heading} className="rounded-lg border border-border bg-slate-50/60 p-3">
                <dt className="text-sm font-medium text-primary-text">{item.heading}</dt>
                <dd className="mt-1 text-sm leading-6 text-secondary-text">{item.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
