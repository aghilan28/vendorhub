// MCP-0A — Media Moderation Platform (Section MCP-0A.7)
// Deterministic moderation state machine + risk scoring + queue helpers.

import type { MediaAnalysis, MediaModeration, MediaQuality, ModerationState } from "./types";

export const MODERATION_TRANSITIONS: Record<ModerationState, ModerationState[]> = {
  pending: ["approved", "rejected", "flagged", "escalated"],
  flagged: ["approved", "rejected", "escalated"],
  escalated: ["approved", "rejected"],
  approved: ["flagged"],
  rejected: [],
};

export function canModerate(from: ModerationState, to: ModerationState): boolean {
  return MODERATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface ModerationDecision {
  ok: boolean;
  next: ModerationState;
  error?: string;
}

export function applyModeration(
  current: ModerationState,
  to: ModerationState,
): ModerationDecision {
  if (!canModerate(current, to)) {
    return { ok: false, next: current, error: `Illegal moderation transition: ${current} -> ${to}` };
  }
  return { ok: true, next: to };
}

/**
 * Computes a 0-100 risk score from analysis + quality. Higher = riskier.
 * Used to auto-route assets to the moderation queue.
 */
export function computeRiskScore(input: {
  analysis?: MediaAnalysis;
  quality: MediaQuality;
}): { risk: number; reasons: string[] } {
  const reasons: string[] = [];
  let risk = 0;

  const unsafe = input.analysis?.unsafeScore ?? 0;
  if (unsafe > 0) {
    risk += unsafe * 60;
    if (unsafe > 0.5) reasons.push("unsafe_content");
  }
  if (input.analysis?.isLikelyDuplicateOf) {
    risk += 20;
    reasons.push("duplicate");
  }
  if (input.quality.watermarkRisk > 50) {
    risk += 15;
    reasons.push("watermark");
  }
  if (input.quality.score < 50) {
    risk += 15;
    reasons.push("low_quality");
  }
  if (input.quality.flags.includes("suspiciously_small")) {
    risk += 10;
    reasons.push("suspicious_size");
  }

  return { risk: Math.max(0, Math.min(100, Math.round(risk))), reasons };
}

/** Auto-decision: low-risk auto-approves; otherwise routes to a queue. */
export function autoModerate(input: { analysis?: MediaAnalysis; quality: MediaQuality }): MediaModeration {
  const { risk, reasons } = computeRiskScore(input);
  const unsafe = input.analysis?.unsafeScore ?? 0;
  const state: ModerationState = unsafe > 0.85 ? "rejected" : risk >= 50 ? "flagged" : risk >= 25 ? "pending" : "approved";
  return {
    state,
    riskScore: risk,
    reasons,
    reviewedBy: state === "approved" ? "system" : null,
    reviewedAt: state === "approved" ? new Date(0).toISOString() : null,
  };
}

export interface QueueItem {
  assetId: string;
  riskScore: number;
  state: ModerationState;
}

/** Orders a moderation queue: riskiest first, flagged/escalated above pending. */
export function orderQueue(items: QueueItem[]): QueueItem[] {
  const priority: Record<ModerationState, number> = {
    escalated: 0,
    flagged: 1,
    pending: 2,
    approved: 3,
    rejected: 4,
  };
  return [...items].sort(
    (a, b) => priority[a.state] - priority[b.state] || b.riskScore - a.riskScore,
  );
}
