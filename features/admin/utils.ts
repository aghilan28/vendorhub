import type { GovernanceTone, ModerationStatus, VendorStatus } from "./types";

export function labelize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function severityTone(severity: string): GovernanceTone {
  if (severity === "critical" || severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "neutral";
}

export function moderationTone(status: ModerationStatus): GovernanceTone {
  if (status === "rejected" || status === "suspended") return "danger";
  if (status === "pending_review" || status === "flagged") return "warning";
  return "success";
}

export function vendorTone(status: VendorStatus): GovernanceTone {
  if (status === "suspended") return "danger";
  if (status === "pending" || status === "needs_review") return "warning";
  return "success";
}
