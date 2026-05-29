import { tier14PackageManifests, tier14TraceabilityMatrix } from "../../lib/tier14";

export const knowledgeRepresentationPackage = tier14PackageManifests.find((manifest) => manifest.packageName === "knowledge-representation");
export const knowledgeRepresentationTrace = tier14TraceabilityMatrix.filter((row) => row.researchConcept === "knowledge_representation");
