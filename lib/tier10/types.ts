export type InstitutionalState = "birth" | "growth" | "stagnation" | "fragmentation" | "collapse" | "replacement";
export type VerificationStatus = "pending" | "passed" | "failed";
export type HorizonYears = 10 | 25 | 50 | 100 | 250 | 500;

export interface InstitutionStateVector {
  institutionId: string;
  state: InstitutionalState;
  fitnessScore: number;
  entropyScore: number;
  legitimacyScore: number;
  adaptabilityScore: number;
  survivalProbability: number;
}

export interface GovernanceInvariant {
  id: string;
  statement: string;
  scope: string;
  severity: "safety" | "liveness" | "civilizational";
}

export interface AmendmentValidationInput {
  amendmentId: string;
  proofPassed: boolean;
  alloyPassed: boolean;
  smtPassed: boolean;
  simulationPassed: boolean;
  rollbackAvailable: boolean;
  invariants: GovernanceInvariant[];
}

export interface EvidenceEdge {
  relation: "supports" | "contradicts" | "qualifies" | "derives_from";
  weight: number;
  trustScore: number;
}

export interface KnowledgeClaimInput {
  claimId: string;
  confidence: number;
  evidence: EvidenceEdge[];
}

export interface PreservationInput {
  replicaCount: number;
  regionCount: number;
  independenceScore: number;
  halfLifeYears: number;
  formatObsolescenceRisk: number;
  bitrotRisk: number;
  latestRetrievalPassed: boolean;
}

export interface AlignmentMeasurement {
  principleId: string;
  subjectId: string;
  previousDistance: number;
  currentDistance: number;
  epsilon: number;
}

export interface StructuralDemographicInput {
  medianWage: number;
  subsistenceWage: number;
  youthBulge: number;
  eliteCount: number;
  elitePositions: number;
  wealthConcentration: number;
  fiscalDistress: number;
  legitimacyLoss: number;
  coercionFragmentation: number;
}

export interface TechnologyDiffusionInput {
  initialAdoption: number;
  innovationCoefficient: number;
  imitationCoefficient: number;
  carryingCapacity: number;
  steps: number;
}

export interface StrategicCompetitionInput {
  coalitionAForce: number;
  coalitionBForce: number;
  coalitionAEffectiveness: number;
  coalitionBEffectiveness: number;
  steps: number;
  model: "ccag" | "lanchester_linear" | "lanchester_square";
}

export interface CivilizationalScenario {
  horizonYears: HorizonYears;
  institutions: InstitutionStateVector[];
  structuralDemography: StructuralDemographicInput;
  alignment: AlignmentMeasurement[];
  seed: number;
}

export type HistoricalCalibrationAdapter =
  | "roman_empire"
  | "han_dynasty"
  | "mughal_empire"
  | "british_empire"
  | "modern_states";

export interface HistoricalCalibrationInput {
  adapter: HistoricalCalibrationAdapter;
  fiscalStress: number;
  eliteCompetition: number;
  frontierPressure: number;
  administrativeCapacity: number;
  legitimacy: number;
  resourcePressure: number;
}
