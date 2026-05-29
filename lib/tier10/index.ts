import { createHash } from "crypto";
import type {
  AlignmentMeasurement,
  AmendmentValidationInput,
  CivilizationalScenario,
  EvidenceEdge,
  HistoricalCalibrationInput,
  HorizonYears,
  InstitutionStateVector,
  InstitutionalState,
  KnowledgeClaimInput,
  PreservationInput,
  StrategicCompetitionInput,
  StructuralDemographicInput,
  TechnologyDiffusionInput,
} from "./types";

export type * from "./types";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function tier10ReplayKey(parts: Array<string | number | boolean>) {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export function transitionInstitutionState(input: InstitutionStateVector): InstitutionalState {
  if (input.state === "birth" && input.legitimacyScore >= 0.45 && input.fitnessScore >= 0.45) return "growth";
  if (input.state === "growth" && (input.adaptabilityScore < 0.35 || input.entropyScore > 0.72)) return "stagnation";
  if (input.state === "stagnation" && input.entropyScore >= 0.82 && input.legitimacyScore < 0.45) return "fragmentation";
  if (input.state === "fragmentation" && input.fitnessScore < 0.25 && input.legitimacyScore < 0.25) return "collapse";
  if (input.state === "collapse" && input.adaptabilityScore >= 0.55 && input.legitimacyScore >= 0.5) return "replacement";
  if (input.state === "replacement" && input.fitnessScore >= 0.5) return "growth";
  return input.state;
}

export function projectInstitution(input: InstitutionStateVector) {
  const nextState = transitionInstitutionState(input);
  const survivalProbability = clamp(
    input.fitnessScore * 0.32 +
      (1 - input.entropyScore) * 0.24 +
      input.legitimacyScore * 0.24 +
      input.adaptabilityScore * 0.2,
  );

  return {
    ...input,
    nextState,
    survivalProbability: round(survivalProbability),
    replayKey: tier10ReplayKey([
      "institution",
      input.institutionId,
      input.state,
      nextState,
      round(survivalProbability),
    ]),
  };
}

export function validateAmendment(input: AmendmentValidationInput) {
  const failedGates = [
    input.proofPassed ? "" : "tla_proof",
    input.alloyPassed ? "" : "alloy_model",
    input.smtPassed ? "" : "smt_constraints",
    input.simulationPassed ? "" : "simulation",
    input.rollbackAvailable ? "" : "rollback_manifest",
  ].filter(Boolean);

  return {
    amendmentId: input.amendmentId,
    activationAllowed: failedGates.length === 0,
    failedGates,
    proofObligations: input.invariants.map((invariant) => `${invariant.scope}:${invariant.id}`),
    replayKey: tier10ReplayKey([
      "amendment",
      input.amendmentId,
      input.proofPassed,
      input.alloyPassed,
      input.smtPassed,
      input.simulationPassed,
      input.rollbackAvailable,
      input.invariants.map((item) => item.id).join(","),
    ]),
  };
}

export function compileGovernanceRule(ruleKey: string, expression: string) {
  const normalized = expression.replace(/\s+/g, " ").trim();
  return {
    ruleKey,
    tla: `Invariant_${ruleKey} == ${normalized}`,
    alloy: `pred ${ruleKey} { ${normalized} }`,
    smt: `(assert ${normalized})`,
    artifactHash: tier10ReplayKey(["governance-rule", ruleKey, normalized]),
  };
}

export function reconcileEvidence(input: KnowledgeClaimInput) {
  const support = input.evidence
    .filter((edge) => edge.relation === "supports" || edge.relation === "derives_from")
    .reduce((sum, edge) => sum + edge.weight * edge.trustScore, 0);
  const contradiction = input.evidence
    .filter((edge) => edge.relation === "contradicts")
    .reduce((sum, edge) => sum + edge.weight * edge.trustScore, 0);
  const qualification = input.evidence.filter((edge) => edge.relation === "qualifies").length;
  const netSupport = support - contradiction;
  const truthState =
    contradiction > support && contradiction >= 0.35
      ? "contradicted"
      : contradiction > 0.2
        ? "contested"
        : support >= 0.45
          ? "supported"
          : "unverified";

  return {
    claimId: input.claimId,
    truthState,
    supportScore: round(support),
    contradictionScore: round(contradiction),
    uncertaintyWidth: round(clamp(1 - Math.abs(netSupport) + qualification * 0.05)),
    replayKey: tier10ReplayKey(["truth", input.claimId, support.toFixed(6), contradiction.toFixed(6), truthState]),
  };
}

export function reviseBelief(claim: KnowledgeClaimInput, newEvidence: EvidenceEdge[]) {
  return reconcileEvidence({ ...claim, evidence: [...claim.evidence, ...newEvidence] });
}

export function scorePreservation(input: PreservationInput) {
  const redundancyScore = clamp((1 - Math.exp(-input.replicaCount / 3)) * 0.65 + clamp(input.regionCount / 5) * 0.35);
  const durabilityScore = clamp(
    redundancyScore * 0.35 +
      input.independenceScore * 0.25 +
      clamp(input.halfLifeYears / 500) * 0.2 +
      (1 - input.formatObsolescenceRisk) * 0.1 +
      (1 - input.bitrotRisk) * 0.1,
  );
  const retrievalSurvivabilityScore = clamp(durabilityScore * 0.7 + (input.latestRetrievalPassed ? 0.3 : 0));

  return {
    durabilityScore: round(durabilityScore),
    redundancyScore: round(redundancyScore),
    retrievalSurvivabilityScore: round(retrievalSurvivabilityScore),
  };
}

export function detectAlignmentDrift(input: AlignmentMeasurement) {
  const driftDelta = input.currentDistance - input.previousDistance;
  const severity = driftDelta <= input.epsilon ? "info" : driftDelta <= input.epsilon * 2 ? "watch" : "critical";
  return {
    ...input,
    driftDelta: round(driftDelta),
    severity,
    remediationRequired: severity !== "info",
    actions:
      severity === "critical"
        ? ["freeze activation", "run constitutional policy consistency check", "prepare rollback remediation"]
        : severity === "watch"
          ? ["mark advisory", "increase measurement cadence"]
          : ["continue long-horizon tracking"],
  };
}

export function calculateStructuralDemography(input: StructuralDemographicInput) {
  const mmp = input.subsistenceWage / Math.max(input.medianWage, 0.000001) + input.youthBulge;
  const emp = input.eliteCount / Math.max(input.elitePositions, 0.000001) + input.wealthConcentration;
  const sfd = input.fiscalDistress + input.legitimacyLoss + input.coercionFragmentation;
  return {
    mmp: round(mmp),
    emp: round(emp),
    sfd: round(sfd),
    psi: round(mmp * emp * sfd),
  };
}

export function bassDiffusion(input: TechnologyDiffusionInput) {
  const points: number[] = [round(clamp(input.initialAdoption, 0, input.carryingCapacity), 6)];
  for (let step = 1; step <= input.steps; step += 1) {
    const current = points[points.length - 1];
    const adoptionRate =
      (input.innovationCoefficient + input.imitationCoefficient * (current / input.carryingCapacity)) *
      (input.carryingCapacity - current);
    points.push(round(clamp(current + adoptionRate, 0, input.carryingCapacity), 6));
  }
  return points;
}

export function polyaUrnLockIn(initialCounts: number[], draws: number, reinforcement = 1) {
  const counts = [...initialCounts];
  for (let draw = 0; draw < draws; draw += 1) {
    const total = counts.reduce((sum, value) => sum + value, 0);
    let cursor = (draw * 0.61803398875 - Math.floor(draw * 0.61803398875)) * total;
    const index = counts.findIndex((count) => {
      cursor -= count;
      return cursor <= 0;
    });
    counts[Math.max(0, index)] += reinforcement;
  }
  const total = counts.reduce((sum, value) => sum + value, 0);
  return counts.map((count) => round(count / total, 6));
}

export function simulateTechnologyCompetition(adoptionShares: number[], fitness: number[], steps: number) {
  let shares = adoptionShares.map((share) => clamp(share));
  for (let step = 0; step < steps; step += 1) {
    const averageFitness = shares.reduce((sum, share, index) => sum + share * fitness[index], 0);
    shares = shares.map((share, index) => clamp(share * (fitness[index] / Math.max(averageFitness, 0.000001))));
    const total = shares.reduce((sum, share) => sum + share, 0);
    shares = shares.map((share) => round(share / Math.max(total, 0.000001), 6));
  }
  return shares;
}

export function simulateStrategicCompetition(input: StrategicCompetitionInput) {
  let a = input.coalitionAForce;
  let b = input.coalitionBForce;
  const trajectory = [{ a: round(a), b: round(b) }];

  for (let step = 0; step < input.steps; step += 1) {
    const aLoss =
      input.model === "lanchester_square"
        ? input.coalitionBEffectiveness * b
        : input.coalitionBEffectiveness * Math.min(a, b);
    const bLoss =
      input.model === "ccag"
        ? input.coalitionAEffectiveness * a * clamp(1 - b / Math.max(a + b, 1))
        : input.coalitionAEffectiveness * (input.model === "lanchester_square" ? a : Math.min(a, b));
    a = Math.max(0, a - aLoss);
    b = Math.max(0, b - bLoss);
    trajectory.push({ a: round(a), b: round(b) });
  }

  return {
    trajectory,
    winner: a === b ? "stalemate" : a > b ? "coalition_a" : "coalition_b",
    attritionRatio: round((input.coalitionAForce - a) / Math.max(input.coalitionBForce - b, 0.000001)),
  };
}

export function runCivilizationalProjection(scenario: CivilizationalScenario) {
  const horizonMultiplier: Record<HorizonYears, number> = {
    10: 0.35,
    25: 0.55,
    50: 0.75,
    100: 1,
    250: 1.35,
    500: 1.7,
  };
  const institutional = scenario.institutions.map(projectInstitution);
  const structural = calculateStructuralDemography(scenario.structuralDemography);
  const alignment = scenario.alignment.map(detectAlignmentDrift);
  const collapsePressure = clamp(
    (structural.psi / 10) * horizonMultiplier[scenario.horizonYears] +
      institutional.filter((item) => item.nextState === "fragmentation" || item.nextState === "collapse").length /
        Math.max(institutional.length, 1) +
      alignment.filter((item) => item.severity === "critical").length / Math.max(alignment.length, 1),
  );

  return {
    horizonYears: scenario.horizonYears,
    institutional,
    structural,
    alignment,
    collapsePressure: round(collapsePressure),
    replayKey: tier10ReplayKey([
      "civilization",
      scenario.horizonYears,
      scenario.seed,
      structural.psi,
      institutional.map((item) => item.replayKey).join(","),
    ]),
  };
}

const calibrationWeights: Record<HistoricalCalibrationInput["adapter"], Record<keyof Omit<HistoricalCalibrationInput, "adapter">, number>> = {
  roman_empire: {
    fiscalStress: 0.22,
    eliteCompetition: 0.2,
    frontierPressure: 0.2,
    administrativeCapacity: -0.16,
    legitimacy: -0.14,
    resourcePressure: 0.08,
  },
  han_dynasty: {
    fiscalStress: 0.2,
    eliteCompetition: 0.18,
    frontierPressure: 0.14,
    administrativeCapacity: -0.2,
    legitimacy: -0.18,
    resourcePressure: 0.1,
  },
  mughal_empire: {
    fiscalStress: 0.2,
    eliteCompetition: 0.22,
    frontierPressure: 0.12,
    administrativeCapacity: -0.14,
    legitimacy: -0.16,
    resourcePressure: 0.16,
  },
  british_empire: {
    fiscalStress: 0.16,
    eliteCompetition: 0.12,
    frontierPressure: 0.18,
    administrativeCapacity: -0.18,
    legitimacy: -0.14,
    resourcePressure: 0.22,
  },
  modern_states: {
    fiscalStress: 0.18,
    eliteCompetition: 0.18,
    frontierPressure: 0.08,
    administrativeCapacity: -0.2,
    legitimacy: -0.22,
    resourcePressure: 0.14,
  },
};

export function runHistoricalCalibration(input: HistoricalCalibrationInput) {
  const weights = calibrationWeights[input.adapter];
  const instabilityScore = clamp(
    0.5 +
      input.fiscalStress * weights.fiscalStress +
      input.eliteCompetition * weights.eliteCompetition +
      input.frontierPressure * weights.frontierPressure +
      input.administrativeCapacity * weights.administrativeCapacity +
      input.legitimacy * weights.legitimacy +
      input.resourcePressure * weights.resourcePressure,
  );

  return {
    adapter: input.adapter,
    instabilityScore: round(instabilityScore),
    fitScore: round(1 - Math.abs(0.5 - instabilityScore)),
    dominantDrivers: Object.entries(weights)
      .map(([driver, weight]) => ({ driver, contribution: round(input[driver as keyof Omit<HistoricalCalibrationInput, "adapter">] * weight) }))
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 3),
    replayKey: tier10ReplayKey([
      "historical-calibration",
      input.adapter,
      input.fiscalStress,
      input.eliteCompetition,
      input.frontierPressure,
      input.administrativeCapacity,
      input.legitimacy,
      input.resourcePressure,
    ]),
  };
}
