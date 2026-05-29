import { createHash } from "crypto";
import type {
  BradleyTerryComparison,
  BradleyTerryItem,
  ClaimAuditInput,
  CliodynamicPrimitiveInput,
  ConsensusRoundInput,
  DiscoveryValidationInput,
  ForecastPositionInput,
  LegitimacySignalInput,
  ReputationInput,
  RoyaltyInput,
  ScoreResult,
  ValidationLifecycleState,
} from "./types";

export type * from "./types";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function tier11ReplayKey(parts: Array<string | number | boolean>) {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export const validationMarketTransitions: Record<ValidationLifecycleState, ValidationLifecycleState[]> = {
  CLAIM_SUBMITTED: ["MARKET_CREATED"],
  MARKET_CREATED: ["FORECASTING"],
  FORECASTING: ["REPLICATION_RUNNING"],
  REPLICATION_RUNNING: ["EVIDENCE_COLLECTION"],
  EVIDENCE_COLLECTION: ["SETTLEMENT"],
  SETTLEMENT: ["REPUTATION_UPDATE"],
  REPUTATION_UPDATE: ["ARCHIVED"],
  ARCHIVED: [],
};

export function transitionValidationMarket(from: ValidationLifecycleState, to: ValidationLifecycleState) {
  const allowed = validationMarketTransitions[from].includes(to);
  return {
    from,
    to,
    allowed,
    replayKey: tier11ReplayKey(["validation-market-transition", from, to, allowed]),
  };
}

export function scoreForecast(input: ForecastPositionInput): ScoreResult {
  const p = clamp(input.probability, 0.000001, 0.999999);
  const y = input.outcome ? 1 : 0;
  const rawScore =
    input.scoringRule === "brier"
      ? 1 - (p - y) ** 2
      : input.scoringRule === "log"
        ? y * Math.log(p) + (1 - y) * Math.log(1 - p)
        : 2 * p * y + 2 * (1 - p) * (1 - y) - (p ** 2 + (1 - p) ** 2);
  const normalized = input.scoringRule === "log" ? clamp(1 + rawScore / 13.815511) : clamp(rawScore);

  return {
    participantId: input.participantId,
    scoringRule: input.scoringRule,
    rawScore: round(rawScore),
    payoutWeight: round(normalized * Math.max(input.stake, 0)),
    auditHash: tier11ReplayKey([
      "forecast-score",
      input.participantId,
      input.probability.toFixed(6),
      input.stake.toFixed(6),
      input.outcome,
      input.scoringRule,
    ]),
  };
}

export function settlePredictionMarket(positions: ForecastPositionInput[]) {
  const scored = positions.map(scoreForecast);
  const totalWeight = scored.reduce((sum, item) => sum + item.payoutWeight, 0);
  return {
    positions: scored,
    payouts: scored.map((item) => ({
      participantId: item.participantId,
      payoutShare: totalWeight === 0 ? 0 : round(item.payoutWeight / totalWeight),
      auditHash: item.auditHash,
    })),
    settlementHash: tier11ReplayKey(scored.map((item) => `${item.participantId}:${item.auditHash}`)),
  };
}

export function runDelphiRound(input: ConsensusRoundInput) {
  const totalWeight = input.forecasts.reduce(
    (sum, forecast) => sum + forecast.expertiseWeight * forecast.reputationWeight,
    0,
  );
  const consensus =
    totalWeight === 0
      ? 0
      : input.forecasts.reduce(
          (sum, forecast) => sum + forecast.estimate * forecast.expertiseWeight * forecast.reputationWeight,
          0,
        ) / totalWeight;
  const maxDeviation = input.forecasts.reduce((max, forecast) => Math.max(max, Math.abs(forecast.estimate - consensus)), 0);

  return {
    sessionId: input.sessionId,
    roundNumber: input.roundNumber,
    consensusEstimate: round(consensus),
    maxDeviation: round(maxDeviation),
    converged: maxDeviation <= input.convergenceEpsilon,
    replayKey: tier11ReplayKey([
      "delphi",
      input.sessionId,
      input.roundNumber,
      consensus.toFixed(8),
      maxDeviation.toFixed(8),
    ]),
  };
}

export function runFortytwoSwarm(votes: Array<{ nodeId: string; vector: number[]; weight: number }>) {
  const dimensions = Math.max(...votes.map((vote) => vote.vector.length));
  const totals = Array.from({ length: dimensions }, () => 0);
  const totalWeight = votes.reduce((sum, vote) => sum + vote.weight, 0);
  votes.forEach((vote) => vote.vector.forEach((value, index) => (totals[index] += value * vote.weight)));
  const centroid = totals.map((value) => round(value / Math.max(totalWeight, 0.000001)));
  const cohesion =
    votes.length === 0
      ? 0
      : votes.reduce((sum, vote) => {
          const distance = Math.sqrt(vote.vector.reduce((inner, value, index) => inner + (value - centroid[index]) ** 2, 0));
          return sum + 1 / (1 + distance);
        }, 0) / votes.length;

  return {
    centroid,
    cohesion: round(cohesion),
    quorumReached: votes.length >= 42 && cohesion >= 0.62,
    replayKey: tier11ReplayKey(["fortytwo", votes.length, centroid.join(","), cohesion.toFixed(8)]),
  };
}

export function scorePeerPrediction(report: boolean, predictedPeerTrueRate: number, actualPeerTrueRate: number) {
  const directionalAccuracy = report ? actualPeerTrueRate : 1 - actualPeerTrueRate;
  const calibration = 1 - Math.abs(clamp(predictedPeerTrueRate) - clamp(actualPeerTrueRate));
  return {
    score: round(clamp(0.6 * directionalAccuracy + 0.4 * calibration)),
    calibration: round(calibration),
    directionalAccuracy: round(directionalAccuracy),
  };
}

export function updateBradleyTerryRatings(items: BradleyTerryItem[], comparisons: BradleyTerryComparison[], learningRate = 0.08) {
  const ratings = new Map(items.map((item) => [item.itemId, item.rating]));
  comparisons.forEach((comparison) => {
    const winnerRating = ratings.get(comparison.winnerId) ?? 0;
    const loserRating = ratings.get(comparison.loserId) ?? 0;
    const expected = Math.exp(winnerRating) / (Math.exp(winnerRating) + Math.exp(loserRating));
    const delta = learningRate * comparison.weight * (1 - expected);
    ratings.set(comparison.winnerId, round(winnerRating + delta));
    ratings.set(comparison.loserId, round(loserRating - delta));
  });
  return Array.from(ratings.entries()).map(([itemId, rating]) => ({ itemId, rating }));
}

export function computeReputation(input: ReputationInput) {
  const decayedPrior = input.prior * Math.exp(-input.decayRate * input.elapsedPeriods);
  const updated = clamp(decayedPrior * 0.55 + input.accuracyScore * 0.3 + input.lineageScore * 0.15 - input.slashingPenalty);
  return {
    participantId: input.participantId,
    reputation: round(updated),
    decayedPrior: round(decayedPrior),
    trustBand: updated >= 0.8 ? "high" : updated >= 0.55 ? "medium" : updated >= 0.3 ? "watch" : "restricted",
    replayKey: tier11ReplayKey([
      "reputation",
      input.participantId,
      input.prior.toFixed(6),
      input.accuracyScore.toFixed(6),
      input.lineageScore.toFixed(6),
      input.slashingPenalty.toFixed(6),
    ]),
  };
}

export function routeKnowledgeRoyalties(input: RoyaltyInput) {
  const protocolFee = input.grossRevenue * input.protocolFeeRate;
  const distributable = input.grossRevenue - protocolFee;
  const ownerRoutes = input.ownerShares.map((owner) => ({
    routeType: "owner" as const,
    id: owner.ownerId,
    amount: round(distributable * owner.share),
  }));
  const dependencyRoutes = input.dependencyShares.map((dependency) => ({
    routeType: "dependency" as const,
    id: dependency.assetId,
    amount: round(distributable * dependency.share),
  }));
  const routedTotal = [...ownerRoutes, ...dependencyRoutes].reduce((sum, route) => sum + route.amount, 0);
  return {
    assetId: input.assetId,
    protocolFee: round(protocolFee),
    routes: [...ownerRoutes, ...dependencyRoutes],
    reserve: round(input.grossRevenue - protocolFee - routedTotal),
    ledgerHash: tier11ReplayKey(["royalty", input.assetId, input.grossRevenue.toFixed(6), routedTotal.toFixed(6)]),
  };
}

export function calculateCliodynamicPrimitives(input: CliodynamicPrimitiveInput) {
  const mmp = input.subsistenceWage / Math.max(input.medianWage, 0.000001) + input.youthShare + input.massMobilization;
  const emp = input.elitePopulation / Math.max(input.elitePositions, 0.000001) + input.topWealthShare;
  const sfd = input.fiscalDistress + (1 - input.institutionalTrust) + input.publicDebtToGdp;
  const psi = mmp * emp * sfd;
  return {
    mmp: round(mmp),
    emp: round(emp),
    sfd: round(sfd),
    psi: round(psi),
    gini: round(clamp(input.topWealthShare * 1.18)),
    trust: round(clamp(input.institutionalTrust)),
    debt: round(input.publicDebtToGdp),
    eliteDensity: round(input.elitePopulation / Math.max(input.elitePositions, 0.000001)),
  };
}

export function validateDiscoveryResult(input: DiscoveryValidationInput) {
  const statisticallyValid = input.pValue <= 0.05;
  const practicallyValid = Math.abs(input.effectSize) >= input.minimumEffectSize;
  const replicated = input.replicationCount >= input.requiredReplications;
  const evidenceValid = input.evidenceIntegrity >= 0.85;
  return {
    hypothesisId: input.hypothesisId,
    accepted: statisticallyValid && practicallyValid && replicated && evidenceValid,
    failedChecks: [
      statisticallyValid ? "" : "statistical_significance",
      practicallyValid ? "" : "minimum_effect_size",
      replicated ? "" : "replication_count",
      evidenceValid ? "" : "evidence_integrity",
    ].filter(Boolean),
    replayKey: tier11ReplayKey([
      "discovery",
      input.hypothesisId,
      input.pValue.toFixed(8),
      input.effectSize.toFixed(8),
      input.replicationCount,
      input.evidenceIntegrity.toFixed(6),
    ]),
  };
}

export function auditClaim(input: ClaimAuditInput) {
  const contradictionPressure = input.contradictionWeight - input.supportWeight;
  const quarantineRequired =
    contradictionPressure >= 0.25 || input.lineageCompleteness < 0.75 || input.evidenceIntegrity < 0.8;
  return {
    claimId: input.claimId,
    quarantineRequired,
    auditScore: round(clamp(input.supportWeight * 0.35 + input.lineageCompleteness * 0.3 + input.evidenceIntegrity * 0.35 - Math.max(0, contradictionPressure))),
    reason: quarantineRequired
      ? contradictionPressure >= 0.25
        ? "contradiction_pressure"
        : input.lineageCompleteness < 0.75
          ? "lineage_gap"
          : "evidence_integrity"
      : "verified",
    replayKey: tier11ReplayKey([
      "claim-audit",
      input.claimId,
      input.supportWeight.toFixed(6),
      input.contradictionWeight.toFixed(6),
      input.lineageCompleteness.toFixed(6),
      input.evidenceIntegrity.toFixed(6),
    ]),
  };
}

export function monitorLegitimacy(input: LegitimacySignalInput) {
  const stress = clamp(input.psi / 8) * 0.32 + (1 - input.trust) * 0.24 + input.gini * 0.16 + clamp(input.debt / 2) * 0.16 + clamp(input.eliteDensity / 3) * 0.12;
  const trigger =
    stress >= 0.78
      ? "redistribution_required"
      : stress >= 0.62
        ? "adaptive_policy_review"
        : stress >= 0.45
          ? "stress_watch"
          : "stable";
  return {
    scopeId: input.scopeId,
    stressScore: round(stress),
    trigger,
    actuationAllowed: trigger === "redistribution_required" || trigger === "adaptive_policy_review",
    replayKey: tier11ReplayKey(["legitimacy", input.scopeId, stress.toFixed(8), trigger]),
  };
}
