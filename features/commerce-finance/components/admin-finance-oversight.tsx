import { AlertTriangle, BadgeIndianRupee, Landmark, ReceiptText, RotateCcw, WalletCards } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatting/currency";
import { getAdminFinanceSnapshot } from "../server";
import { FinanceMetricCard } from "./finance-metric-card";

export async function AdminFinanceOversight() {
  const data = await getAdminFinanceSnapshot();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <FinanceMetricCard icon={BadgeIndianRupee} label="GMV settled" value={data.metrics.grossSales} helper="From settlement ledger records" />
        <FinanceMetricCard icon={WalletCards} label="Platform revenue" value={data.metrics.platformRevenue} helper="Commission less refund adjustments" />
        <FinanceMetricCard icon={Landmark} label="Available payout" value={data.metrics.availableBalance} helper={`${data.metrics.settlementBacklog} settlements in payout flow`} />
        <FinanceMetricCard icon={RotateCcw} label="Refund queue value" value={data.metrics.refundQueueAmount} helper="Open refund exposure" />
        <FinanceMetricCard icon={AlertTriangle} label="Reconciliation cases" value={data.metrics.openReconciliationCases.toLocaleString("en-IN")} helper="Open finance exceptions" />
      </div>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-primary-text">Settlement Observability</h2>
            <p className="text-sm text-secondary-text">Commission, payout eligibility, refund deductions, and lifecycle state across sellers.</p>
          </div>
          <Badge variant="ai">Ledger authoritative</Badge>
        </div>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Refunds</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.settlements.slice(0, 25).map((settlement) => (
                <TableRow key={settlement.id}>
                  <TableCell>
                    <p className="font-medium">{settlement.orderNumber}</p>
                    <p className="text-xs text-secondary-text">{settlement.paymentReference ?? "No payment reference"}</p>
                  </TableCell>
                  <TableCell>{formatCurrency(settlement.grossAmount)}</TableCell>
                  <TableCell>{formatCurrency(settlement.commissionAmount)}</TableCell>
                  <TableCell>{formatCurrency(settlement.availableAmount)}</TableCell>
                  <TableCell>{formatCurrency(settlement.refundAdjustmentAmount)}</TableCell>
                  <TableCell>{new Date(settlement.expectedPayoutAt).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell><Badge variant={settlement.lifecycleState === "PAYOUT_COMPLETED" ? "default" : settlement.lifecycleState === "PAYOUT_FAILED" ? "danger" : "warning"}>{settlement.lifecycleState.replaceAll("_", " ")}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold text-primary-text"><ReceiptText className="size-4" /> Refund Accounting</h2>
          {data.refunds.length ? (
            <div className="mt-4 space-y-3">
              {data.refunds.slice(0, 8).map((refund) => (
                <div key={refund.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-primary-text">{refund.orderNumber}</p>
                    <Badge variant={refund.state === "REFUND_SUCCEEDED" ? "default" : refund.state === "REFUND_FAILED" ? "danger" : "warning"}>{refund.state.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-secondary-text">{refund.reason}</p>
                  <p className="mt-2 text-sm font-medium">{formatCurrency(refund.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={RotateCcw} title="No refund accounting cases" description="Refund requests will appear with order, state, and settlement impact." />
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold text-primary-text"><AlertTriangle className="size-4" /> Reconciliation Cases</h2>
          {data.reconciliationCases.length ? (
            <div className="mt-4 space-y-3">
              {data.reconciliationCases.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-primary-text">{item.title}</p>
                    <Badge variant={item.severity === "critical" ? "danger" : "warning"}>{item.type.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-secondary-text">{item.detail}</p>
                  <p className="mt-2 text-xs text-secondary-text">{item.recoveryAction}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={AlertTriangle} title="No reconciliation exceptions" description="Payment, payout, refund, and settlement drift cases will appear here." />
          )}
        </div>
      </section>
    </div>
  );
}
