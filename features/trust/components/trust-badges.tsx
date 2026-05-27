import { AlertTriangle, BadgeCheck, Ban, Clock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TrustLevel, VerificationState } from "../types";
import { trustLevelLabel, verificationLabel } from "../scoring";

export function VerificationStateBadge({ state }: { state: VerificationState }) {
  const variant = state === "VERIFIED" ? "default" : state === "SUSPENDED" || state === "REJECTED" ? "danger" : state === "PENDING_REVIEW" || state === "RESUBMISSION_REQUIRED" ? "warning" : "secondary";
  const Icon = state === "VERIFIED" ? BadgeCheck : state === "SUSPENDED" || state === "REJECTED" ? Ban : state === "PENDING_REVIEW" ? Clock : AlertTriangle;
  return <Badge variant={variant}><Icon className="size-3" /> {verificationLabel(state)}</Badge>;
}

export function TrustLevelBadge({ level }: { level: TrustLevel }) {
  const variant = level === "verified_plus" || level === "trusted" ? "default" : level === "restricted" ? "danger" : "warning";
  return <Badge variant={variant}><ShieldCheck className="size-3" /> {trustLevelLabel(level)}</Badge>;
}
