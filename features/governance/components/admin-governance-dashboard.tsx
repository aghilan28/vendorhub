import { AlertTriangle, BadgeCheck, FileWarning, Gavel, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminGovernanceSnapshot } from "../server";

function severityVariant(severity: string) {
  if (severity === "critical" || severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "secondary";
}

export async function AdminGovernanceDashboard() {
  const data = await getAdminGovernanceSnapshot();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-secondary-text"><ShieldCheck className="size-4 text-brand" /> Open cases</p>
          <p className="mt-3 text-2xl font-semibold text-primary-text">{data.metrics.openCases}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-secondary-text"><AlertTriangle className="size-4 text-brand" /> Critical signals</p>
          <p className="mt-3 text-2xl font-semibold text-primary-text">{data.metrics.criticalSignals}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-secondary-text"><FileWarning className="size-4 text-brand" /> Active disputes</p>
          <p className="mt-3 text-2xl font-semibold text-primary-text">{data.metrics.activeDisputes}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-secondary-text"><Gavel className="size-4 text-brand" /> Enforcement</p>
          <p className="mt-3 text-2xl font-semibold text-primary-text">{data.metrics.activeEnforcement}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm text-secondary-text"><BadgeCheck className="size-4 text-brand" /> Restricted sellers</p>
          <p className="mt-3 text-2xl font-semibold text-primary-text">{data.metrics.restrictedSellers}</p>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-primary-text">Governance Queue</h2>
            <p className="text-sm text-secondary-text">Auditable trust, moderation, dispute, payout review, and fraud review cases.</p>
          </div>
          <Badge variant="ai">Review-first risk scoring</Badge>
        </div>
        {data.cases.length ? (
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Explanation</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.cases.slice(0, 20).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-secondary-text">{item.type.replaceAll("_", " ")}</p>
                    </TableCell>
                    <TableCell>{item.seller}</TableCell>
                    <TableCell><Badge variant={severityVariant(item.severity)}>{item.severity}</Badge></TableCell>
                    <TableCell><Badge variant={item.state === "ESCALATED" ? "danger" : item.state === "RESOLVED" ? "default" : "warning"}>{item.state.replaceAll("_", " ")}</Badge></TableCell>
                    <TableCell className="min-w-80 text-sm text-secondary-text">{item.explanation}</TableCell>
                    <TableCell className="min-w-72 text-sm text-secondary-text">{item.recommendedAction}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState icon={ShieldCheck} title="No governance cases" description="Fraud, moderation, dispute, payout, and verification review cases will appear here." />
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="font-semibold text-primary-text">Risk Signals</h2>
          <div className="mt-4 space-y-3">
            {data.signals.slice(0, 8).map((signal) => (
              <div key={signal.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-primary-text">{signal.type.replaceAll("_", " ")}</p>
                  <Badge variant={severityVariant(signal.severity)}>{signal.score}</Badge>
                </div>
                <p className="mt-1 text-sm text-secondary-text">{signal.seller}</p>
                <p className="mt-2 text-sm text-secondary-text">{signal.explanation}</p>
              </div>
            ))}
            {!data.signals.length ? <EmptyState icon={AlertTriangle} title="No risk signals" description="Deterministic abuse and anomaly signals will appear here." /> : null}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="font-semibold text-primary-text">Dispute Operations</h2>
          <div className="mt-4 space-y-3">
            {data.disputes.slice(0, 8).map((dispute) => (
              <div key={dispute.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-primary-text">{dispute.title}</p>
                  <Badge variant={dispute.state.includes("RESOLVED") ? "default" : "warning"}>{dispute.state.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-xs text-secondary-text">{dispute.type} · {dispute.locale}</p>
                <p className="mt-2 text-sm text-secondary-text">{dispute.description}</p>
              </div>
            ))}
            {!data.disputes.length ? <EmptyState icon={FileWarning} title="No disputes" description="Order, delivery, refund, payout, and appeal disputes will appear here." /> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
