"use client";

// KARTEX M8.10 — Escalation Center
// Track blocked actions, execution risks, missed milestones, failed initiatives
// and critical alerts; acknowledge, resolve and log interventions.

import { useState } from "react";
import { AlertTriangle, Siren } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { useExecutionStore } from "../store";
import { ownerName, severityTone } from "../helpers";

export function EscalationCenter() {
  const data = useExecutionStore((s) => s.data);
  const setEscalationStatus = useExecutionStore((s) => s.setEscalationStatus);
  const addIntervention = useExecutionStore((s) => s.addIntervention);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const blockedActions = data.actionPlans.filter((a) => a.status === "blocked");
  const missedMilestones = data.milestones.filter((m) => m.status === "missed" || m.status === "at_risk");
  const offTrackKpis = data.kpis.filter((k) => k.status === "off_track");
  const openRisks = data.risks.filter((r) => r.status !== "closed").sort((a, b) => b.score - a.score);

  const submitIntervention = (escalationId: string) => {
    const action = drafts[escalationId];
    if (!action || !action.trim()) return;
    if (addIntervention(escalationId, action.trim())) {
      setDrafts((prev) => ({ ...prev, [escalationId]: "" }));
    }
  };

  return (
    <div className="space-y-6">
      <GovernanceCard
        title="Escalations"
        description="Active issues requiring intervention, with audited resolution."
        action={<Siren className="size-4 text-red-500" />}
      >
        <div className="space-y-3">
          {data.escalations.map((escalation) => {
            const interventions = data.interventions.filter((i) => i.escalationId === escalation.id);
            return (
              <div key={escalation.id} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-primary-text">{escalation.title}</p>
                      <Badge variant={severityTone(escalation.severity)}>{escalation.severity}</Badge>
                      <Badge
                        variant={
                          escalation.status === "resolved"
                            ? "default"
                            : escalation.status === "acknowledged"
                              ? "secondary"
                              : "warning"
                        }
                      >
                        {escalation.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-secondary-text">{escalation.reason}</p>
                    <p className="mt-1 text-xs text-secondary-text">
                      Source: {escalation.sourceType} · {escalation.sourceId} · Owner:{" "}
                      {ownerName(data, escalation.ownerId)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={escalation.status !== "open"}
                      onClick={() => setEscalationStatus(escalation.id, "acknowledged")}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      disabled={escalation.status === "resolved"}
                      onClick={() => setEscalationStatus(escalation.id, "resolved")}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>

                {interventions.length > 0 ? (
                  <ul className="mt-3 space-y-1 border-t border-border pt-3">
                    {interventions.map((intervention) => (
                      <li key={intervention.id} className="text-xs text-secondary-text">
                        • {intervention.action} ({new Date(intervention.date).toLocaleDateString()})
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-3 flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Log an intervention…"
                    value={drafts[escalation.id] ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [escalation.id]: e.target.value }))}
                    aria-label={`Intervention for ${escalation.title}`}
                  />
                  <Button size="sm" variant="secondary" onClick={() => submitIntervention(escalation.id)}>
                    Add
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </GovernanceCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GovernanceCard title="Watchlist" description="Signals that may require new escalations." action={<AlertTriangle className="size-4 text-amber-500" />}>
          <div className="space-y-3 text-sm">
            <WatchRow label="Blocked actions" items={blockedActions.map((a) => a.title)} tone="danger" />
            <WatchRow label="Missed / at-risk milestones" items={missedMilestones.map((m) => m.name)} tone="warning" />
            <WatchRow label="Off-track KPIs" items={offTrackKpis.map((k) => k.name)} tone="danger" />
          </div>
        </GovernanceCard>

        <GovernanceCard title="Execution risks" description="Open risks ranked by exposure (likelihood × impact).">
          <ul className="space-y-2">
            {openRisks.map((risk) => (
              <li key={risk.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-primary-text">{risk.title}</p>
                  <p className="text-xs text-secondary-text">Mitigation: {risk.mitigation}</p>
                </div>
                <Badge variant={risk.score >= 12 ? "danger" : risk.score >= 8 ? "warning" : "secondary"}>
                  {risk.score}
                </Badge>
              </li>
            ))}
            {openRisks.length === 0 ? <li className="text-sm text-secondary-text">No open risks.</li> : null}
          </ul>
        </GovernanceCard>
      </div>
    </div>
  );
}

function WatchRow({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "warning" | "danger";
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-primary-text">{label}</span>
        <Badge variant={items.length > 0 ? tone : "default"}>{items.length}</Badge>
      </div>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {items.map((item) => (
            <li key={item} className="text-xs text-secondary-text">
              • {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-secondary-text">All clear.</p>
      )}
    </div>
  );
}
