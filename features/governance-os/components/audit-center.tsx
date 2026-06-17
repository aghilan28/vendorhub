"use client";

import { useState } from "react";
import { ScrollText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AuditObjectType } from "@/lib/governance-os";
import { useGovernanceStore } from "@/store/governance-store";
import { useHydrated } from "../hooks";
import { AUDIT_ACTION_LABELS, formatDateTime, relativeTime } from "../format";
import { GovShell, GovCard, StatTile } from "./primitives";
import { ListSkeleton } from "./skeletons";

function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const OBJECT_TYPES: Array<AuditObjectType | "all"> = ["all", "policy", "decision", "risk", "control", "check", "exception", "report", "settings"];

export function AuditCenter() {
  const hydrated = useHydrated();
  const audit = useGovernanceStore((s) => s.audit);
  const [objectFilter, setObjectFilter] = useState<AuditObjectType | "all">("all");
  if (!hydrated) return <ListSkeleton />;

  const sorted = [...audit].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const filtered = objectFilter === "all" ? sorted : sorted.filter((a) => a.objectType === objectFilter);

  return (
    <GovShell
      title="Audit Center"
      description="The immutable record of who did what, when, and why — across policies, decisions, approvals, exceptions, risks, and compliance."
      actions={<Button variant="secondary" onClick={() => download("governance-audit.json", filtered)}><Download className="size-4" /> Export</Button>}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Audit events" value={String(audit.length)} icon={ScrollText} tone="info" />
        <StatTile label="Approvals" value={String(audit.filter((a) => a.action === "decision_approved" || a.action === "exception_approved").length)} tone="success" />
        <StatTile label="Rejections" value={String(audit.filter((a) => a.action === "decision_rejected" || a.action === "exception_rejected").length)} tone="danger" />
      </div>

      <GovCard title="Audit timeline" description={`${filtered.length} events`} action={
        <Select value={objectFilter} onValueChange={(v) => setObjectFilter(v as AuditObjectType | "all")}>
          <SelectTrigger className="h-9 min-h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{OBJECT_TYPES.map((t) => <SelectItem key={t} value={t}>{t === "all" ? "All objects" : t}</SelectItem>)}</SelectContent>
        </Select>
      }>
        <ol className="relative space-y-4 border-l border-border pl-5">
          {filtered.map((a) => (
            <li key={a.id} className="relative">
              <span className="absolute -left-[1.42rem] top-1 size-2.5 rounded-full bg-brand" aria-hidden />
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{AUDIT_ACTION_LABELS[a.action]}</Badge>
                <Badge variant="default">{a.objectType}</Badge>
                <span className="text-xs text-secondary-text">{formatDateTime(a.at)}</span>
              </div>
              <p className="mt-1 text-sm text-primary-text">{a.summary}{a.objectLabel ? ` — ${a.objectLabel}` : ""}</p>
              {a.reason ? <p className="text-xs text-secondary-text">Why: {a.reason}</p> : null}
              {a.changes?.length ? <p className="text-xs text-secondary-text">{a.changes.map((c) => `${c.field}: ${c.from} → ${c.to}`).join("; ")}</p> : null}
              <p className="text-[11px] text-secondary-text">by {a.actorName} · {relativeTime(a.at)}</p>
            </li>
          ))}
          {filtered.length === 0 ? <li className="text-sm text-secondary-text">No events for this filter.</li> : null}
        </ol>
      </GovCard>
    </GovShell>
  );
}
