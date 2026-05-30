// KARTEX Phase N — Platform Realization Model (types)
// A deterministic, dependency-free description of the whole KARTEX platform
// (M1–M8) used to power the public Platform Map, Tours, Demo Scenarios,
// Showcase Mode, Value Explanations, Storyboard, Business Value Dashboard,
// Use Case Library and Documentation Hub.

/** Stable identifiers for the eight subsystems delivered across M1–M8. */
export type SubsystemId =
  | "research"
  | "knowledge"
  | "simulation"
  | "secis"
  | "governance"
  | "integration"
  | "workspace"
  | "execution";

/** Whether a subsystem is a stage in the intelligence flow or a cross-cutting fabric. */
export type LayerKind = "flow" | "fabric";

export type Accent = "research" | "knowledge" | "simulation" | "secis" | "governance" | "integration" | "workspace" | "execution";

/** One subsystem (an "OS" / layer) of the platform, with its value story. */
export interface Subsystem {
  id: SubsystemId;
  phase: string; // e.g. "M1"
  name: string; // e.g. "Research OS"
  icon: string; // lucide icon key resolved in the UI
  accent: Accent;
  tagline: string;
  /** Value Explanation Center fields (Section N.6). */
  what: string;
  why: string;
  problem: string;
  value: string;
  beneficiaries: string[];
  capabilities: string[];
  /** Where this subsystem can be experienced in the running app, if anywhere. */
  route: string | null;
  /** Subsystems this one depends on. */
  dependsOn: SubsystemId[];
  layerKind: LayerKind;
  /** Position in the intelligence flow (1-based) or null for fabric layers. */
  flowOrder: number | null;
}

/** A stage in the canonical intelligence flow (Section N.7). */
export interface FlowStage {
  order: number;
  subsystemId: SubsystemId;
  title: string;
  description: string;
}

/** What a subsystem contributes within a specific demo scenario. */
export interface ScenarioStage {
  subsystemId: SubsystemId;
  action: string;
  output: string;
}

/** A quantified business impact realised by a scenario. */
export interface ScenarioImpact {
  label: string;
  value: string;
  tone: "positive" | "neutral" | "risk";
}

/** A prebuilt, end-to-end demonstration (Section N.4). */
export interface DemoScenario {
  id: string;
  title: string;
  domain: UseCaseId;
  severity: "low" | "moderate" | "high" | "critical";
  trigger: string;
  summary: string;
  /** One entry per intelligence-flow stage, in order. */
  stages: ScenarioStage[];
  impact: ScenarioImpact[];
  outcome: string;
}

export type UseCaseId =
  | "retail"
  | "commerce"
  | "inventory"
  | "supply-chain"
  | "pricing"
  | "expansion"
  | "operations"
  | "risk-management";

/** A domain-oriented entry in the Use Case Library (Section N.9). */
export interface UseCase {
  id: UseCaseId;
  name: string;
  icon: string;
  headline: string;
  description: string;
  primarySubsystems: SubsystemId[];
  scenarioIds: string[];
}

/** A demonstration metric for the Business Value Dashboard (Section N.8). */
export interface ValueMetric {
  id: string;
  label: string;
  value: string;
  caption: string;
  trend: number[];
  tone: "positive" | "neutral" | "risk";
}

/** A single step in a guided tour (Section N.3). */
export interface TourStep {
  title: string;
  body: string;
  subsystemId: SubsystemId | null;
  route?: string | null;
}

/** A guided tour (per subsystem or the complete platform). */
export interface Tour {
  id: string;
  title: string;
  audience: string;
  durationMinutes: number;
  steps: TourStep[];
}

/** A documentation section in the in-app Documentation Hub (Section N.10). */
export interface DocItem {
  heading: string;
  body: string;
}

export interface DocSection {
  id: string;
  title: string;
  icon: string;
  summary: string;
  items: DocItem[];
}

/** The complete, assembled platform model. */
export interface PlatformModel {
  subsystems: Subsystem[];
  flow: FlowStage[];
  scenarios: DemoScenario[];
  useCases: UseCase[];
  valueMetrics: ValueMetric[];
  tours: Tour[];
  docs: DocSection[];
}
