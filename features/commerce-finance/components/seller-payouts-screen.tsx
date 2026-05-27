import { BadgeIndianRupee, Clock, FileText, Landmark, RotateCcw, WalletCards } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatting/currency";
import { getSellerFinanceSnapshot } from "../server";
import { FinanceMetricCard } from "./finance-metric-card";

function settlementBadge(state: string) {
  if (state === "PAYOUT_COMPLETED") return "default";
  if (state === "PAYOUT_FAILED" || state === "DISPUTED") return "danger";
  return "warning";
}

export async function SellerPayoutsScreen() {
  const data = await getSellerFinanceSnapshot();

  if (!data.vendor) {
    return <EmptyState icon={WalletCards} title="No seller finance workspace" description="Join or create a seller account to view earnings, settlement status, and payout history." />;
  }

  if (!data.settlements.length) {
    return <EmptyState icon={WalletCards} title="No payouts yet" description="Seller earnings, commission calculations, refund adjustments, and payout batches will appear after captured orders." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <FinanceMetricCard icon={BadgeIndianRupee} label="Seller earnings" value={data.metrics.pendingBalance} helper="Ledger-backed net earnings before payout completion" />
        <FinanceMetricCard icon={Clock} label="Available payout" value={data.metrics.availableBalance} helper="Settlement records eligible for a payout batch" />
        <FinanceMetricCard icon={Landmark} label="Paid out" value={data.metrics.paidOut} helper="Completed payout batches" />
        <FinanceMetricCard icon={RotateCcw} label="Refund adjustments" value={data.metrics.refundAdjustments} helper="Refund deductions posted to settlement records" />
      </div>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-primary-text">Settlement Ledger</h2>
            <p className="text-sm text-secondary-text">Order-level earnings with explainable commission, refund adjustment, available balance, and payout lifecycle.</p>
          </div>
          <Badge variant="secondary">Database authoritative</Badge>
        </div>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Refunds</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.settlements.map((settlement) => (
                <TableRow key={settlement.id}>
                  <TableCell>
                    <p className="font-medium">{settlement.orderNumber}</p>
                    <p className="text-xs text-secondary-text">{settlement.paymentReference ?? "No payment reference"}</p>
                  </TableCell>
                  <TableCell>{formatCurrency(settlement.grossAmount)}</TableCell>
                  <TableCell>
                    <p>{formatCurrency(settlement.commissionAmount)}</p>
                    <p className="text-xs text-secondary-text">{settlement.commissionRateBps / 100}%</p>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(settlement.netAmount)}</TableCell>
                  <TableCell>{formatCurrency(settlement.refundAdjustmentAmount)}</TableCell>
                  <TableCell>{formatCurrency(settlement.availableAmount)}</TableCell>
                  <TableCell>{new Date(settlement.expectedPayoutAt).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell><Badge variant={settlementBadge(settlement.lifecycleState)}>{settlement.lifecycleState.replaceAll("_", " ")}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold text-primary-text"><FileText className="size-4" /> Commission Explanation</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.settlements.slice(0, 6).map((settlement) => (
            <div key={settlement.id} className="rounded-md border border-border p-3">
              <p className="font-medium text-primary-text">{settlement.orderNumber}</p>
              <p className="mt-1 text-sm text-secondary-text">{settlement.commissionExplanation}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold text-primary-text"><WalletCards className="size-4" /> Payout History</h2>
        {data.payouts.length ? (
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-mono text-xs">{payout.id.slice(0, 8)}</TableCell>
                    <TableCell>{formatCurrency(payout.amount)}</TableCell>
                    <TableCell>{payout.itemCount}</TableCell>
                    <TableCell>{payout.retryCount}</TableCell>
                    <TableCell>{payout.initiatedAt ? new Date(payout.initiatedAt).toLocaleString("en-IN") : "Queued"}</TableCell>
                    <TableCell>{payout.completedAt ? new Date(payout.completedAt).toLocaleString("en-IN") : "Not completed"}</TableCell>
                    <TableCell><Badge variant={payout.state === "COMPLETED" ? "default" : payout.state === "FAILED" ? "danger" : "warning"}>{payout.state}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState icon={Landmark} title="No payout batches yet" description="Eligible settlements can be batched once payout scheduling runs." />
        )}
      </section>
    </div>
  );
}
