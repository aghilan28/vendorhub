import { describe, expect, it } from "vitest";
import {
  auditClaim,
  calculateCliodynamicPrimitives,
  computeReputation,
  monitorLegitimacy,
  routeKnowledgeRoyalties,
  runDelphiRound,
  runFortytwoSwarm,
  scoreForecast,
  scorePeerPrediction,
  settlePredictionMarket,
  transitionValidationMarket,
  updateBradleyTerryRatings,
  validateDiscoveryResult,
} from "@/lib/tier11";

describe("tier 11 SECIS implementation primitives", () => {
  it("enforces the validation market lifecycle and proper scoring rules", () => {
    expect(transitionValidationMarket("FORECASTING", "REPLICATION_RUNNING").allowed).toBe(true);
    expect(transitionValidationMarket("FORECASTING", "ARCHIVED").allowed).toBe(false);

    const brier = scoreForecast({
      participantId: "did:kartex:alice",
      probability: 0.8,
      stake: 100,
      outcome: true,
      scoringRule: "brier",
    });

    expect(brier.rawScore).toBe(0.96);
    expect(brier.payoutWeight).toBe(96);
    expect(brier.auditHash).toHaveLength(64);
  });

  it("settles prediction markets with audit hashes", () => {
    const settlement = settlePredictionMarket([
      { participantId: "a", probability: 0.9, stake: 10, outcome: true, scoringRule: "brier" },
      { participantId: "b", probability: 0.2, stake: 10, outcome: true, scoringRule: "brier" },
    ]);

    expect(settlement.payouts[0].payoutShare).toBeGreaterThan(settlement.payouts[1].payoutShare);
    expect(settlement.settlementHash).toHaveLength(64);
  });

  it("runs collective intelligence engines", () => {
    const delphi = runDelphiRound({
      sessionId: "consensus-sec-1",
      roundNumber: 2,
      convergenceEpsilon: 0.08,
      forecasts: [
        { participantId: "a", estimate: 0.72, expertiseWeight: 0.9, reputationWeight: 0.8 },
        { participantId: "b", estimate: 0.76, expertiseWeight: 0.8, reputationWeight: 0.9 },
      ],
    });
    const swarm = runFortytwoSwarm(
      Array.from({ length: 42 }, (_, index) => ({
        nodeId: `node-${index}`,
        vector: [0.7 + index * 0.0001, 0.2],
        weight: 1,
      })),
    );
    const peer = scorePeerPrediction(true, 0.68, 0.7);
    const ranked = updateBradleyTerryRatings(
      [
        { itemId: "h1", rating: 0 },
        { itemId: "h2", rating: 0 },
      ],
      [{ winnerId: "h1", loserId: "h2", weight: 1 }],
    );

    expect(delphi.converged).toBe(true);
    expect(swarm.quorumReached).toBe(true);
    expect(peer.score).toBeGreaterThan(0.8);
    expect(ranked.find((item) => item.itemId === "h1")?.rating).toBeGreaterThan(0);
  });

  it("computes reputation, royalties, cliodynamic primitives, and legitimacy triggers", () => {
    const reputation = computeReputation({
      participantId: "did:kartex:lab",
      prior: 0.7,
      accuracyScore: 0.92,
      lineageScore: 0.8,
      slashingPenalty: 0.05,
      decayRate: 0.01,
      elapsedPeriods: 3,
    });
    const royalty = routeKnowledgeRoyalties({
      assetId: "ka-1",
      grossRevenue: 1000,
      protocolFeeRate: 0.04,
      ownerShares: [{ ownerId: "owner-1", share: 0.6 }],
      dependencyShares: [{ assetId: "ka-source", share: 0.25 }],
    });
    const primitives = calculateCliodynamicPrimitives({
      medianWage: 80,
      subsistenceWage: 60,
      youthShare: 0.35,
      elitePopulation: 140,
      elitePositions: 100,
      topWealthShare: 0.62,
      fiscalDistress: 0.7,
      massMobilization: 0.25,
      institutionalTrust: 0.38,
      publicDebtToGdp: 0.9,
    });
    const legitimacy = monitorLegitimacy({
      scopeId: "world-1",
      psi: primitives.psi,
      trust: primitives.trust,
      gini: primitives.gini,
      debt: primitives.debt,
      eliteDensity: primitives.eliteDensity,
    });

    expect(reputation.trustBand).toBe("medium");
    expect(royalty.protocolFee).toBe(40);
    expect(royalty.routes).toHaveLength(2);
    expect(primitives.psi).toBeGreaterThan(4);
    expect(legitimacy.actuationAllowed).toBe(true);
  });

  it("validates discovery results and audits claims for quarantine", () => {
    const discovery = validateDiscoveryResult({
      hypothesisId: "hyp-1",
      pValue: 0.01,
      effectSize: 0.4,
      minimumEffectSize: 0.25,
      replicationCount: 3,
      requiredReplications: 2,
      evidenceIntegrity: 0.91,
    });
    const audit = auditClaim({
      claimId: "claim-1",
      supportWeight: 0.3,
      contradictionWeight: 0.72,
      lineageCompleteness: 0.9,
      evidenceIntegrity: 0.95,
    });

    expect(discovery.accepted).toBe(true);
    expect(audit.quarantineRequired).toBe(true);
    expect(audit.reason).toBe("contradiction_pressure");
  });
});
