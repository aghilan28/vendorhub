import { describe, expect, it } from "vitest";
import {
  bassDiffusion,
  calculateStructuralDemography,
  compileGovernanceRule,
  detectAlignmentDrift,
  projectInstitution,
  reconcileEvidence,
  runHistoricalCalibration,
  runCivilizationalProjection,
  scorePreservation,
  simulateStrategicCompetition,
  validateAmendment,
} from "@/lib/tier10";

describe("tier 10 civilizational governance and simulation systems", () => {
  it("executes the institutional lifecycle finite state machine", () => {
    const projection = projectInstitution({
      institutionId: "inst-civic-court",
      state: "stagnation",
      fitnessScore: 0.31,
      entropyScore: 0.9,
      legitimacyScore: 0.32,
      adaptabilityScore: 0.24,
      survivalProbability: 0.4,
    });

    expect(projection.nextState).toBe("fragmentation");
    expect(projection.replayKey).toHaveLength(64);
  });

  it("blocks constitutional activation until every verification gate passes", () => {
    const validation = validateAmendment({
      amendmentId: "amend-10",
      proofPassed: true,
      alloyPassed: true,
      smtPassed: false,
      simulationPassed: true,
      rollbackAvailable: true,
      invariants: [{ id: "inv-alignment", scope: "alignment", statement: "non-regression", severity: "civilizational" }],
    });

    expect(validation.activationAllowed).toBe(false);
    expect(validation.failedGates).toContain("smt_constraints");
  });

  it("compiles governance rules into formal targets", () => {
    const compiled = compileGovernanceRule("NoActivationWithoutProof", "(=> active proofPassed)");

    expect(compiled.tla).toContain("Invariant_NoActivationWithoutProof");
    expect(compiled.alloy).toContain("pred NoActivationWithoutProof");
    expect(compiled.smt).toContain("(assert");
  });

  it("reconciles evidence and scores preservation durability", () => {
    const truth = reconcileEvidence({
      claimId: "claim-sdt-psi",
      confidence: 0.7,
      evidence: [
        { relation: "supports", weight: 0.8, trustScore: 0.9 },
        { relation: "contradicts", weight: 0.25, trustScore: 0.5 },
      ],
    });
    const preservation = scorePreservation({
      replicaCount: 7,
      regionCount: 4,
      independenceScore: 0.9,
      halfLifeYears: 500,
      formatObsolescenceRisk: 0.1,
      bitrotRisk: 0.05,
      latestRetrievalPassed: true,
    });

    expect(truth.truthState).toBe("supported");
    expect(preservation.durabilityScore).toBeGreaterThan(0.85);
    expect(preservation.retrievalSurvivabilityScore).toBeGreaterThan(0.9);
  });

  it("calculates structural demographic pressure and long horizon projections", () => {
    const structural = calculateStructuralDemography({
      medianWage: 80,
      subsistenceWage: 60,
      youthBulge: 0.35,
      eliteCount: 140,
      elitePositions: 100,
      wealthConcentration: 0.6,
      fiscalDistress: 0.7,
      legitimacyLoss: 0.6,
      coercionFragmentation: 0.4,
    });
    const projection = runCivilizationalProjection({
      horizonYears: 100,
      seed: 42,
      structuralDemography: {
        medianWage: 80,
        subsistenceWage: 60,
        youthBulge: 0.35,
        eliteCount: 140,
        elitePositions: 100,
        wealthConcentration: 0.6,
        fiscalDistress: 0.7,
        legitimacyLoss: 0.6,
        coercionFragmentation: 0.4,
      },
      institutions: [
        {
          institutionId: "inst-senate",
          state: "fragmentation",
          fitnessScore: 0.2,
          entropyScore: 0.9,
          legitimacyScore: 0.2,
          adaptabilityScore: 0.2,
          survivalProbability: 0.3,
        },
      ],
      alignment: [{ principleId: "align-1", subjectId: "policy-1", previousDistance: 0.1, currentDistance: 0.35, epsilon: 0.05 }],
    });

    expect(structural.psi).toBeGreaterThan(3);
    expect(projection.collapsePressure).toBe(1);
    expect(projection.replayKey).toHaveLength(64);
  });

  it("runs technology diffusion, alignment drift, and strategic competition modules", () => {
    const diffusion = bassDiffusion({
      initialAdoption: 0.02,
      innovationCoefficient: 0.03,
      imitationCoefficient: 0.38,
      carryingCapacity: 1,
      steps: 10,
    });
    const drift = detectAlignmentDrift({
      principleId: "align-non-regression",
      subjectId: "recursive-policy",
      previousDistance: 0.1,
      currentDistance: 0.24,
      epsilon: 0.05,
    });
    const conflict = simulateStrategicCompetition({
      coalitionAForce: 100,
      coalitionBForce: 80,
      coalitionAEffectiveness: 0.03,
      coalitionBEffectiveness: 0.025,
      steps: 5,
      model: "lanchester_square",
    });

    expect(diffusion[diffusion.length - 1]).toBeGreaterThan(diffusion[0]);
    expect(drift.severity).toBe("critical");
    expect(conflict.trajectory).toHaveLength(6);
  });

  it("executes named historical calibration adapters", () => {
    const calibration = runHistoricalCalibration({
      adapter: "roman_empire",
      fiscalStress: 0.8,
      eliteCompetition: 0.7,
      frontierPressure: 0.65,
      administrativeCapacity: 0.35,
      legitimacy: 0.3,
      resourcePressure: 0.5,
    });

    expect(calibration.adapter).toBe("roman_empire");
    expect(calibration.dominantDrivers.length).toBe(3);
    expect(calibration.replayKey).toHaveLength(64);
  });
});
