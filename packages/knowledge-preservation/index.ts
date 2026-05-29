import { assessMemoryHorizon, tier14PackageManifests, tier14TraceabilityMatrix } from "../../lib/tier14";

export const knowledgePreservationPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "knowledge-preservation");
export const knowledgePreservationTrace = tier14TraceabilityMatrix.filter((row) => row.researchConcept === "knowledge_persistence");
export const knowledgePreservationEngine = { assessMemoryHorizon };
