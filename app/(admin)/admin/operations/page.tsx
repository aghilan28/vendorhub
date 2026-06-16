"use client";

import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/page-container";
import type {
  CancellationRequest,
  MarketplaceOperationsSnapshot,
  OperationalIntelligenceSnapshot,
} from "@/lib/marketplace-operations";

type OperationsData = {
  snapshot: MarketplaceOperationsSnapshot;
  intelligence: OperationalIntelligenceSnapshot;
  cancellations: CancellationRequest[];
};

export default function AdminOperationsPage() {
  const [data, setData] = useState<OperationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("overview");

  useEffect(() => {
    fetch("/api/operations/marketplace")
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageContainer><div className="animate-pulse p-8 text-center">Loading Operations Center...</div></PageContainer>;
  if (!data) return <PageContainer><div className="p-8 text-center text-muted-foreground">Unable to load operations data.</div></PageContainer>;

  const { snapshot, intelligence } = data;
  const tabs = ["overview", "support", "disputes", "incidents", "fulfillment", "sellers", "customers", "refunds", "intelligence"];

  return (
    <PageContainer className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketplace Operations Center</h1>
          <p className="text-muted-foreground text-sm">Unified operational governance &amp; control</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            snapshot.overallHealth >= 70 ? "bg-green-100 text-green-800" :
            snapshot.overallHealth >= 50 ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          }`}>
            Health: {snapshot.overallHealth}/100
          </span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Preview (sample data)</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b pb-1">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 text-sm font-medium rounded-t capitalize whitespace-nowrap ${activeTab === tab ? "bg-background border border-b-0 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab snapshot={snapshot} intelligence={intelligence} />}
      {activeTab === "support" && <SupportTab data={snapshot.supportSnapshot} />}
      {activeTab === "disputes" && <DisputeTab data={snapshot.disputeSnapshot} />}
      {activeTab === "incidents" && <IncidentTab data={snapshot.incidentSnapshot} />}
      {activeTab === "fulfillment" && <FulfillmentTab data={snapshot.fulfillmentSnapshot} />}
      {activeTab === "sellers" && <SellerTab data={snapshot.sellerSnapshot} />}
      {activeTab === "customers" && <CustomerTab data={snapshot.customerSnapshot} />}
      {activeTab === "refunds" && <RefundTab data={snapshot.refundSnapshot} />}
      {activeTab === "intelligence" && <IntelligenceTab data={intelligence} />}
    </PageContainer>
  );
}

// ─── Tab Components ────────────────────────────────────────────────────────────

function MetricCard({ label, value, status }: { label: string; value: string | number; status?: "good" | "warning" | "critical" }) {
  const colors = { good: "border-green-200 bg-green-50", warning: "border-yellow-200 bg-yellow-50", critical: "border-red-200 bg-red-50" };
  return (
    <div className={`p-4 rounded-lg border ${status ? colors[status] : "border-border"}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function OverviewTab({ snapshot, intelligence }: { snapshot: MarketplaceOperationsSnapshot; intelligence: OperationalIntelligenceSnapshot }) {
  return (
    <div className="space-y-6">
      {/* Health by Domain */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(snapshot.healthByDomain).map(([domain, score]) => (
          <div key={domain} className={`p-3 rounded-lg border text-center ${score >= 70 ? "border-green-200" : score >= 50 ? "border-yellow-200" : "border-red-200"}`}>
            <p className="text-xs text-muted-foreground capitalize">{domain}</p>
            <p className="text-xl font-bold">{score}</p>
          </div>
        ))}
      </div>

      {/* KPIs */}
      <div>
        <h3 className="font-semibold mb-3">Key Performance Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {snapshot.kpis.map((kpi) => (
            <MetricCard key={kpi.id} label={kpi.name} value={`${typeof kpi.value === "number" ? kpi.value.toFixed(1) : kpi.value}${kpi.unit}`} status={kpi.status} />
          ))}
        </div>
      </div>

      {/* Alerts */}
      {snapshot.activeAlerts.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Active Alerts ({snapshot.activeAlerts.length})</h3>
          <div className="space-y-2">
            {snapshot.activeAlerts.map((alert) => (
              <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                alert.severity === "critical" ? "border-l-red-500 bg-red-50" :
                alert.severity === "urgent" ? "border-l-orange-500 bg-orange-50" :
                alert.severity === "high" ? "border-l-yellow-500 bg-yellow-50" :
                "border-l-blue-500 bg-blue-50"
              }`}>
                <p className="font-medium text-sm">{alert.title}</p>
                <p className="text-xs text-muted-foreground">{alert.description}</p>
                <p className="text-xs mt-1 font-medium">Action: {alert.suggestedAction}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Concerns */}
      <div>
        <h3 className="font-semibold mb-3">Top Concerns</h3>
        <ul className="space-y-1">
          {intelligence.topConcerns.map((c, i) => (
            <li key={i} className="text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400" />{c}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SupportTab({ data }: { data: MarketplaceOperationsSnapshot["supportSnapshot"] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Tickets" value={data.totalTickets} />
        <MetricCard label="Open Tickets" value={data.openTickets} status={data.openTickets > 10 ? "warning" : "good"} />
        <MetricCard label="SLA Compliance" value={`${(data.slaComplianceRate * 100).toFixed(0)}%`} status={data.slaComplianceRate >= 0.9 ? "good" : "critical"} />
        <MetricCard label="Avg Resolution" value={`${data.avgResolutionMinutes}m`} />
        <MetricCard label="Escalation Rate" value={`${(data.escalationRate * 100).toFixed(0)}%`} status={data.escalationRate > 0.2 ? "warning" : "good"} />
        <MetricCard label="Satisfaction" value={`${data.satisfactionAverage}/5`} status={data.satisfactionAverage >= 4 ? "good" : "warning"} />
        <MetricCard label="1st Response" value={`${(data.firstResponseComplianceRate * 100).toFixed(0)}%`} status={data.firstResponseComplianceRate >= 0.9 ? "good" : "warning"} />
      </div>
      {data.agentPerformance.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Agent Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left p-2">Agent</th><th className="text-right p-2">Tickets</th><th className="text-right p-2">Avg Resolution</th><th className="text-right p-2">CSAT</th><th className="text-right p-2">SLA</th></tr></thead>
              <tbody>{data.agentPerformance.map((a) => (
                <tr key={a.agentId} className="border-b"><td className="p-2">{a.agentName}</td><td className="text-right p-2">{a.ticketsHandled}</td><td className="text-right p-2">{a.avgResolutionMinutes}m</td><td className="text-right p-2">{a.satisfactionScore.toFixed(1)}</td><td className="text-right p-2">{(a.slaCompliance * 100).toFixed(0)}%</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DisputeTab({ data }: { data: MarketplaceOperationsSnapshot["disputeSnapshot"] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard label="Total Disputes" value={data.totalDisputes} />
      <MetricCard label="Open Disputes" value={data.openDisputes} status={data.openDisputes > 10 ? "warning" : "good"} />
      <MetricCard label="Avg Resolution" value={`${data.avgResolutionDays}d`} status={data.avgResolutionDays > 7 ? "critical" : "good"} />
      <MetricCard label="Buyer Win Rate" value={`${(data.buyerWinRate * 100).toFixed(0)}%`} />
      <MetricCard label="Seller Win Rate" value={`${(data.sellerWinRate * 100).toFixed(0)}%`} />
      <MetricCard label="Escalation Rate" value={`${(data.escalationRate * 100).toFixed(0)}%`} status={data.escalationRate > 0.2 ? "warning" : "good"} />
      <MetricCard label="Total Amount" value={`₹${data.totalDisputeAmount.toLocaleString()}`} />
      <MetricCard label="Avg Amount" value={`₹${data.avgDisputeAmount.toLocaleString()}`} />
    </div>
  );
}

function IncidentTab({ data }: { data: MarketplaceOperationsSnapshot["incidentSnapshot"] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard label="Total Incidents" value={data.totalIncidents} />
      <MetricCard label="Open Incidents" value={data.openIncidents} status={data.openIncidents > 0 ? "critical" : "good"} />
      <MetricCard label="MTTR" value={`${data.mttr}h`} status={data.mttr > 12 ? "warning" : "good"} />
      <MetricCard label="MTTA" value={`${data.mtta}m`} status={data.mtta > 30 ? "warning" : "good"} />
      <MetricCard label="Postmortem Rate" value={`${(data.postmortemCompletionRate * 100).toFixed(0)}%`} status={data.postmortemCompletionRate >= 0.8 ? "good" : "warning"} />
    </div>
  );
}

function FulfillmentTab({ data }: { data: MarketplaceOperationsSnapshot["fulfillmentSnapshot"] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Orders" value={data.totalOrders} />
        <MetricCard label="Pending" value={data.pendingFulfillment} />
        <MetricCard label="In Transit" value={data.inTransit} />
        <MetricCard label="Delivered" value={data.delivered} />
        <MetricCard label="On-Time Rate" value={`${(data.onTimeRate * 100).toFixed(0)}%`} status={data.onTimeRate >= 0.95 ? "good" : data.onTimeRate >= 0.85 ? "warning" : "critical"} />
        <MetricCard label="Avg Delivery" value={`${data.avgDeliveryDays}d`} />
        <MetricCard label="SLA Breaches" value={data.slaBreachCount} status={data.slaBreachCount > 0 ? "warning" : "good"} />
        <MetricCard label="Exceptions" value={data.exceptionCount} status={data.exceptionCount > 0 ? "warning" : "good"} />
      </div>
      {data.carrierPerformance.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Carrier Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left p-2">Carrier</th><th className="text-right p-2">Volume</th><th className="text-right p-2">On-Time</th></tr></thead>
              <tbody>{data.carrierPerformance.map((c) => (
                <tr key={c.carrier} className="border-b"><td className="p-2">{c.carrier}</td><td className="text-right p-2">{c.volume}</td><td className="text-right p-2">{(c.onTimeRate * 100).toFixed(0)}%</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SellerTab({ data }: { data: MarketplaceOperationsSnapshot["sellerSnapshot"] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard label="Total Sellers" value={data.totalSellers} />
      <MetricCard label="Excellent" value={data.excellentSellers} status="good" />
      <MetricCard label="Watch" value={data.watchSellers} status={data.watchSellers > 0 ? "warning" : "good"} />
      <MetricCard label="Probation" value={data.probationSellers} status={data.probationSellers > 0 ? "critical" : "good"} />
      <MetricCard label="Suspended" value={data.suspendedSellers} status={data.suspendedSellers > 0 ? "critical" : "good"} />
      <MetricCard label="Open Violations" value={data.openViolations} status={data.openViolations > 0 ? "warning" : "good"} />
      <MetricCard label="Avg Fulfillment" value={`${(data.avgFulfillmentRate * 100).toFixed(0)}%`} />
      <MetricCard label="Avg Rating" value={`${data.avgCustomerRating}/5`} />
    </div>
  );
}

function CustomerTab({ data }: { data: MarketplaceOperationsSnapshot["customerSnapshot"] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Customers" value={data.totalCustomers} />
        <MetricCard label="Healthy" value={data.healthyCustomers} status="good" />
        <MetricCard label="At Risk" value={data.atRiskCustomers} status={data.atRiskCustomers > 0 ? "warning" : "good"} />
        <MetricCard label="Churning" value={data.churningCustomers} status={data.churningCustomers > 0 ? "critical" : "good"} />
        <MetricCard label="Open Complaints" value={data.openComplaints} />
        <MetricCard label="Pending Refunds" value={data.pendingRefunds} />
        <MetricCard label="Pending Cancellations" value={data.pendingCancellations} />
        <MetricCard label="Avg Satisfaction" value={`${data.avgSatisfaction}/5`} />
      </div>
      {data.topRiskFactors.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Top Risk Factors</h3>
          <ul className="space-y-1">{data.topRiskFactors.map((f) => (
            <li key={f.factor} className="text-sm flex justify-between border-b py-1"><span>{f.factor}</span><span className="font-medium">{f.count} customers</span></li>
          ))}</ul>
        </div>
      )}
    </div>
  );
}

function RefundTab({ data }: { data: MarketplaceOperationsSnapshot["refundSnapshot"] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard label="Total Refunds" value={data.totalRefunds} />
      <MetricCard label="Approved" value={data.approvedRefunds} />
      <MetricCard label="Rejected" value={data.rejectedRefunds} />
      <MetricCard label="Total Amount" value={`₹${data.totalAmount.toLocaleString()}`} />
      <MetricCard label="Auto-Approval Rate" value={`${(data.autoApprovalRate * 100).toFixed(0)}%`} />
      <MetricCard label="Fraud Detected" value={data.fraudDetectedCount} status={data.fraudDetectedCount > 0 ? "warning" : "good"} />
      <MetricCard label="Avg Processing" value={`${data.avgProcessingHours}h`} />
    </div>
  );
}

function IntelligenceTab({ data }: { data: OperationalIntelligenceSnapshot }) {
  return (
    <div className="space-y-6">
      {/* Risks */}
      <div>
        <h3 className="font-semibold mb-3">Operational Risks ({data.risks.length})</h3>
        {data.risks.length === 0 ? <p className="text-sm text-muted-foreground">No active operational risks.</p> : (
          <div className="space-y-2">
            {data.risks.map((risk) => (
              <div key={risk.id} className={`p-3 rounded-lg border-l-4 ${
                risk.severity === "critical" ? "border-l-red-500 bg-red-50" :
                risk.severity === "high" ? "border-l-orange-500 bg-orange-50" :
                "border-l-yellow-500 bg-yellow-50"
              }`}>
                <div className="flex justify-between items-start">
                  <p className="font-medium text-sm">{risk.title}</p>
                  <span className="text-xs bg-white px-2 py-0.5 rounded">{(risk.confidence * 100).toFixed(0)}% confidence</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{risk.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div>
        <h3 className="font-semibold mb-3">Recommendations ({data.recommendations.length})</h3>
        <div className="space-y-2">
          {data.recommendations.map((rec) => (
            <div key={rec.id} className="p-3 rounded-lg border bg-background">
              <div className="flex justify-between items-start">
                <p className="font-medium text-sm">{rec.title}</p>
                <span className={`text-xs px-2 py-0.5 rounded ${rec.effort === "low" ? "bg-green-100" : rec.effort === "medium" ? "bg-yellow-100" : "bg-red-100"}`}>{rec.effort} effort</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
              <p className="text-xs font-medium mt-1">Impact: {rec.expectedImpact}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Forecasts */}
      <div>
        <h3 className="font-semibold mb-3">Operational Forecasts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.forecasts.map((f) => (
            <div key={f.metric} className="p-3 rounded-lg border">
              <p className="text-sm font-medium">{f.metric}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-bold">{f.currentValue.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">→</span>
                <span className={`text-lg font-bold ${f.trend === "improving" ? "text-green-600" : f.trend === "degrading" ? "text-red-600" : ""}`}>{f.forecastValue}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{f.forecastPeriod} • {(f.confidence * 100).toFixed(0)}% confidence</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
