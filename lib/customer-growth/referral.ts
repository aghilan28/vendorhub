// MCP-1D Phase 4 — Referral Platform (deterministic, pure).
//
// Referral codes/links, tracking, rewards, fraud protection, attribution,
// leaderboards and governance. Code generation is deterministic from the
// referrer id so it is stable and testable.

import type {
  ReferralAssessment,
  ReferralCode,
  ReferralFraudCheck,
  ReferralLeaderboardEntry,
  ReferralRecord,
  ReferralStatus,
  ReferralSummary,
} from "./types";

const REWARD_REFERRER = 200; // points to referrer when a referral qualifies
const QUALIFY_MIN_ORDERS = 1;
const QUALIFY_MIN_SPEND = 299;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

/** Deterministic, collision-resistant-ish code from a referrer id. */
export function generateReferralCode(referrerId: string, baseUrl = "https://vendorhub.app"): ReferralCode {
  let hash = 2166136261;
  for (let i = 0; i < referrerId.length; i++) {
    hash ^= referrerId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let n = Math.abs(hash);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[n % ALPHABET.length];
    n = Math.floor(n / ALPHABET.length);
  }
  const final = `VH${code}`;
  return { code: final, link: `${baseUrl}/sign-up?ref=${final}` };
}

/** Fraud heuristics over a single referral. Higher fraudScore = riskier. */
export function assessReferral(record: ReferralRecord): ReferralAssessment {
  const checks: ReferralFraudCheck[] = [];
  let fraudScore = 0;

  const selfReferral = Boolean(record.refereeId && record.refereeId === record.referrerId);
  checks.push({ id: "self_referral", passed: !selfReferral, detail: selfReferral ? "Referrer and referee are the same account." : "Distinct accounts." });
  if (selfReferral) fraudScore += 60;

  checks.push({ id: "same_device", passed: !record.sameDevice, detail: record.sameDevice ? "Same device/IP as referrer." : "Independent device/IP." });
  if (record.sameDevice) fraudScore += 30;

  const tooFast = (record.refereeOrders ?? 0) === 0 && record.createdDaysAgo <= 0;
  checks.push({ id: "velocity", passed: !tooFast, detail: tooFast ? "Signed up but no qualifying activity." : "Activity timeline plausible." });

  const qualifies = (record.refereeOrders ?? 0) >= QUALIFY_MIN_ORDERS && (record.refereeSpend ?? 0) >= QUALIFY_MIN_SPEND;
  checks.push({ id: "qualification", passed: qualifies, detail: qualifies ? "Referee met order + spend threshold." : "Referee has not met the qualification threshold." });

  fraudScore = Math.min(100, fraudScore);

  let status: ReferralStatus;
  let reason: string;
  let rewardPoints = 0;
  if (fraudScore >= 60) {
    status = "flagged";
    reason = "Flagged by fraud heuristics; manual review required.";
  } else if (!qualifies) {
    status = "pending";
    reason = "Awaiting referee qualification (first order ≥ ₹299).";
  } else {
    status = "rewarded";
    reason = "Qualified referral — reward issued to referrer.";
    rewardPoints = REWARD_REFERRER;
  }

  return { referralId: record.id, status, fraudScore, checks, rewardPoints, reason };
}

export interface ReferralAttribution {
  referrerId: string;
  attributed: number; // qualified+rewarded referees
  revenue: number; // referee spend attributed
}

/** Attribute referee spend back to referrers (qualified/rewarded only). */
export function attributeReferrals(records: ReferralRecord[]): ReferralAttribution[] {
  const map = new Map<string, ReferralAttribution>();
  for (const r of records) {
    const a = assessReferral(r);
    if (a.status !== "rewarded" && a.status !== "qualified") continue;
    const entry = map.get(r.referrerId) ?? { referrerId: r.referrerId, attributed: 0, revenue: 0 };
    entry.attributed += 1;
    entry.revenue += r.refereeSpend ?? 0;
    map.set(r.referrerId, entry);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export function buildReferralLeaderboard(
  records: ReferralRecord[],
  names: Record<string, string> = {},
): ReferralLeaderboardEntry[] {
  const map = new Map<string, ReferralLeaderboardEntry>();
  for (const r of records) {
    const a = assessReferral(r);
    const entry =
      map.get(r.referrerId) ?? { referrerId: r.referrerId, name: names[r.referrerId] ?? r.referrerId, qualified: 0, rewarded: 0, pointsEarned: 0, rank: 0 };
    if (a.status === "qualified") entry.qualified += 1;
    if (a.status === "rewarded") {
      entry.rewarded += 1;
      entry.qualified += 1;
      entry.pointsEarned += a.rewardPoints;
    }
    map.set(r.referrerId, entry);
  }
  const ranked = [...map.values()].sort((a, b) => b.pointsEarned - a.pointsEarned || b.rewarded - a.rewarded);
  ranked.forEach((e, i) => (e.rank = i + 1));
  return ranked;
}

/** Per-referrer summary for the customer growth center. */
export function buildReferralSummary(referrerId: string, records: ReferralRecord[], baseUrl?: string): ReferralSummary {
  const mine = records.filter((r) => r.referrerId === referrerId);
  const assessments = mine.map(assessReferral);
  const pending = assessments.filter((a) => a.status === "pending").length;
  const qualified = assessments.filter((a) => a.status === "qualified").length;
  const rewarded = assessments.filter((a) => a.status === "rewarded").length;
  const flagged = assessments.filter((a) => a.status === "flagged").length;
  const pointsEarned = assessments.reduce((sum, a) => sum + a.rewardPoints, 0);
  const total = mine.length;
  const conversionRate = total ? Math.round((rewarded / total) * 100) : 0;
  return {
    code: generateReferralCode(referrerId, baseUrl),
    total,
    pending,
    qualified,
    rewarded,
    flagged,
    pointsEarned,
    conversionRate,
  };
}
