"use client";

// KARTEX Phase O.10 — Platform Documentation Hub (/platform/docs)
// Audience guides + capability documentation, in-app and public.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPlatformModel, platformGuides } from "@/lib/platform";
import { Icon } from "./shared";

export function PlatformDocs() {
  const { docs } = getPlatformModel();

  return (
    <div className="space-y-8">
      <header>
        <Link
          href="/platform"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand focus-ring"
        >
          <ArrowLeft className="size-4" /> Back to platform
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-primary-text">Documentation</h1>
        <p className="mt-1 max-w-2xl text-sm text-secondary-text">
          Everything needed to understand, present, evaluate and operate KARTEX — for users, presenters, judges,
          investors and faculty.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary-text">Guides by audience</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {platformGuides.map((guide) => (
            <article
              key={guide.id}
              id={guide.id}
              className="scroll-mt-24 rounded-xl border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-brand ring-1 ring-emerald-100">
                  <Icon name={guide.icon} className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-primary-text">{guide.title}</h3>
                  <p className="text-xs text-secondary-text">For: {guide.audience}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-secondary-text">{guide.summary}</p>
              <dl className="mt-3 space-y-2">
                {guide.sections.map((section) => (
                  <div key={section.heading} className="rounded-lg border border-border bg-slate-50/60 p-3">
                    <dt className="text-sm font-medium text-primary-text">{section.heading}</dt>
                    <dd className="mt-1 text-sm leading-6 text-secondary-text">{section.body}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary-text">Reference</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {docs.map((doc) => (
            <article key={doc.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-secondary-text">
                  <Icon name={doc.icon} className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-primary-text">{doc.title}</h3>
                  <p className="text-xs text-secondary-text">{doc.summary}</p>
                </div>
              </div>
              <dl className="mt-3 space-y-2">
                {doc.items.map((item) => (
                  <div key={item.heading} className="rounded-lg border border-border bg-slate-50/60 p-3">
                    <dt className="text-sm font-medium text-primary-text">{item.heading}</dt>
                    <dd className="mt-1 text-sm leading-6 text-secondary-text">{item.body}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
