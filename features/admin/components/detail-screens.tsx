"use client";

import { Bell, FileText, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { OperationalBarChart } from "@/components/charts/operational-bar-chart";
import { adminNotifications, auditLogs, flags, vendors } from "../data";
import { useAdminAnalytics } from "../queries";
import { labelize, severityTone, vendorTone } from "../utils";
import { AdminSettingsForm, GovernanceNoteForm } from "./forms";
import { GovernanceBadge } from "./governance-badge";
import { GovernanceCard } from "./governance-card";
import { GovernanceTable, type GovernanceColumn } from "./governance-table";
import { AdminDashboardSkeleton } from "./loading";
import type { AuditLogEntry } from "../types";
import { FlagsScreen } from "./table-screens";
import { PlatformHealthScreen } from "@/features/operations/components/platform-health-screen";

export function VendorDetailScreen({ id }: { id: string }) {
  const vendor = vendors.find((item) => item.id === id) ?? vendors[0];
  return (
    <div className="space-y-6">
      <GovernanceCard title={vendor.businessName} description={`${vendor.owner} · ${vendor.category} · ${vendor.zone}`}>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Approval status</p><div className="mt-2"><GovernanceBadge label={vendor.status} tone={vendorTone(vendor.status)} /></div></div>
          <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Risk</p><div className="mt-2"><GovernanceBadge label={vendor.risk} tone={severityTone(vendor.risk)} /></div></div>
          <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">30d orders placeholder</p><p className="mt-2 font-semibold text-primary-text">{vendor.orders30d}</p></div>
          <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Fulfillment placeholder</p><p className="mt-2 font-semibold text-primary-text">{vendor.fulfillmentRate}%</p></div>
        </div>
      </GovernanceCard>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <GovernanceCard title="Seller profile review" description="Business details, seller information, uploaded documents placeholder, and marketplace activity placeholders.">
          <div className="grid gap-3 md:grid-cols-2">
            {vendor.documents.map((document) => <div key={document} className="rounded-md border border-dashed border-border bg-slate-50 p-3 text-sm font-medium text-primary-text"><FileText className="mb-2 size-4 text-secondary-text" />{document}</div>)}
          </div>
          <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-secondary-text">{vendor.notes}</div>
        </GovernanceCard>
        <GovernanceCard title="Approval workflow" description="Approve, reject, suspend, and record auditable operational notes.">
          <GovernanceNoteForm label="Seller governance decision" />
        </GovernanceCard>
      </div>

      <GovernanceCard title="Seller history placeholder" description="Moderation history and operational activity will accumulate here.">
        <div className="grid gap-3 md:grid-cols-3">
          {["No live KYC verification", "Manual approval infrastructure", vendor.ratingPlaceholder].map((item) => <div key={item} className="rounded-md bg-slate-50 p-3 text-sm font-medium text-primary-text">{item}</div>)}
        </div>
      </GovernanceCard>
    </div>
  );
}

export function AuditLogsScreen() {
  const columns: GovernanceColumn<AuditLogEntry>[] = [
    { key: "id", header: "Log ID", sortable: true, render: (item) => <p className="font-medium text-primary-text">{item.id}</p> },
    { key: "actor", header: "Actor", render: (item) => item.actor },
    { key: "action", header: "Action", render: (item) => item.action },
    { key: "target", header: "Target", render: (item) => item.target },
    { key: "domain", header: "Domain", render: (item) => <GovernanceBadge label={item.domain} tone="info" /> },
    { key: "timestamp", header: "Timestamp", render: (item) => item.timestamp },
    { key: "note", header: "Trace note", className: "min-w-72", render: (item) => <p className="text-sm text-secondary-text">{item.note}</p> },
  ];
  return <GovernanceTable title="Audit logs" description="Immutable-feeling admin action history for moderation, seller approvals, category changes, refunds, and operations." rows={auditLogs} columns={columns} empty={<EmptyState icon={FileText} title="No audit logs" description="Governance action history will appear here." />} />;
}

export function AdminAnalyticsScreen() {
  const { data, isLoading } = useAdminAnalytics();
  if (isLoading || !data) return <AdminDashboardSkeleton />;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <GovernanceCard title="Marketplace growth placeholder" description="Growth visualization foundation."><OperationalBarChart values={data.growth} /></GovernanceCard>
        <GovernanceCard title="Order trends" description="Platform order volume by day."><OperationalBarChart values={data.orders} /></GovernanceCard>
        <GovernanceCard title="Moderation metrics placeholder" description="Queue pressure by day."><OperationalBarChart values={data.moderation} /></GovernanceCard>
      </div>
      <GovernanceCard title="Operational metrics" description="Category performance, seller activity, and governance indicators prepared for future analytics engine.">
        <div className="grid gap-3 md:grid-cols-4">
          {["Seller activity +18%", "Category performance ready", "Refund pressure 11 open", "Trust queue 23 flags"].map((item) => <div key={item} className="rounded-md bg-slate-50 p-3 text-sm font-medium text-primary-text">{item}</div>)}
        </div>
      </GovernanceCard>
    </div>
  );
}

export function AdminNotificationsScreen() {
  return (
    <GovernanceCard title="Admin notification center" description="Operational alerts, moderation alerts, seller alerts, system warnings, and refund alerts.">
      <div className="space-y-3">
        {adminNotifications.length === 0 ? <EmptyState icon={Bell} title="No alerts" description="No governance notifications are pending." /> : adminNotifications.map((item) => (
          <div key={item.id} className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><Bell className="size-4 text-secondary-text" /><p className="font-medium text-primary-text">{item.title}</p>{!item.read ? <GovernanceBadge label="unread" tone="warning" /> : null}</div>
              <p className="mt-1 text-sm text-secondary-text">{item.detail}</p>
            </div>
            <p className="text-xs font-medium text-secondary-text">{labelize(item.type)} · {item.time}</p>
          </div>
        ))}
      </div>
    </GovernanceCard>
  );
}

export function PlatformHealthPlaceholderScreen() {
  return <PlatformHealthScreen />;
}

export function AdminSettingsScreen() {
  return (
    <GovernanceCard title="Admin settings" description="Platform settings, moderation settings, feature flags, notification settings, and admin preferences placeholders.">
      <AdminSettingsForm />
    </GovernanceCard>
  );
}

export function FlagsRouteScreen() {
  return <FlagsScreen flags={flags} />;
}

export function ModerationActionPanel() {
  return (
    <GovernanceCard title="Moderation action form" description="Reusable governance note form for structured decisions.">
      <GovernanceNoteForm label="Moderation action" />
    </GovernanceCard>
  );
}

export function SettingsTrustPanel() {
  return (
    <GovernanceCard title="Trust and safety posture" description="Trust states, moderation states, and escalation indicators.">
      <div className="grid gap-3 md:grid-cols-3">
        {["Manual review required", "Escalations auditable", "No AI moderation enabled"].map((item) => <div key={item} className="flex items-center gap-3 rounded-md bg-slate-50 p-3"><ShieldCheck className="size-4 text-success" /><span className="text-sm font-medium text-primary-text">{item}</span></div>)}
      </div>
    </GovernanceCard>
  );
}
