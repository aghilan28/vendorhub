// KARTEX Phase N — Platform Realization Model
// Public surface for the platform demonstration layer. Deterministic and
// dependency-free; safe to import from server components and the client.

export * from "./types";
export { subsystems, intelligenceFlow, FLOW_SUBSYSTEM_IDS } from "./subsystems";
export { scenarios } from "./scenarios";
export { useCases } from "./usecases";
export { valueMetrics } from "./value";
export { tours } from "./tours";
export { docSections } from "./docs";
export { platformGuides, type PlatformGuide, type GuideSection } from "./guides";
export {
  searchPlatform,
  buildSearchIndex,
  searchKindLabel,
  SEARCH_DOMAINS,
  type SearchKind,
  type SearchResult,
} from "./search";

import { docSections } from "./docs";
import { scenarios } from "./scenarios";
import { intelligenceFlow, subsystems } from "./subsystems";
import { tours } from "./tours";
import { useCases } from "./usecases";
import { valueMetrics } from "./value";
import type { DemoScenario, PlatformModel, Subsystem, SubsystemId, UseCase, UseCaseId } from "./types";

/** Returns the complete, assembled platform model. */
export function getPlatformModel(): PlatformModel {
  return { subsystems, flow: intelligenceFlow, scenarios, useCases, valueMetrics, tours, docs: docSections };
}

const subsystemIndex = new Map<SubsystemId, Subsystem>(subsystems.map((s) => [s.id, s]));

export function getSubsystem(id: SubsystemId): Subsystem | undefined {
  return subsystemIndex.get(id);
}

export function getScenario(id: string): DemoScenario | undefined {
  return scenarios.find((scenario) => scenario.id === id);
}

export function getUseCase(id: UseCaseId): UseCase | undefined {
  return useCases.find((useCase) => useCase.id === id);
}

export function getScenariosForUseCase(id: UseCaseId): DemoScenario[] {
  const useCase = getUseCase(id);
  if (!useCase) return [];
  return useCase.scenarioIds
    .map((scenarioId) => getScenario(scenarioId))
    .filter((scenario): scenario is DemoScenario => Boolean(scenario));
}

/** Returns the subsystems a given subsystem depends on, resolved to objects. */
export function getDependencies(id: SubsystemId): Subsystem[] {
  const subsystem = getSubsystem(id);
  if (!subsystem) return [];
  return subsystem.dependsOn
    .map((depId) => getSubsystem(depId))
    .filter((s): s is Subsystem => Boolean(s));
}

export interface PlatformIntegrityReport {
  ok: boolean;
  issues: string[];
}

/**
 * Validates the internal integrity of the platform model: every scenario
 * covers the full intelligence flow in order, references valid subsystems, and
 * every use case points at known subsystems and scenarios.
 */
export function validatePlatformModel(): PlatformIntegrityReport {
  const issues: string[] = [];
  const ids = new Set(subsystems.map((s) => s.id));
  const scenarioIds = new Set(scenarios.map((s) => s.id));
  const flowIds = intelligenceFlow.map((stage) => stage.subsystemId);

  for (const subsystem of subsystems) {
    for (const dep of subsystem.dependsOn) {
      if (!ids.has(dep)) issues.push(`${subsystem.id} depends on unknown subsystem ${dep}`);
    }
  }

  for (const scenario of scenarios) {
    const stageIds = scenario.stages.map((stage) => stage.subsystemId);
    if (stageIds.length !== flowIds.length || stageIds.some((id, i) => id !== flowIds[i])) {
      issues.push(`scenario ${scenario.id} does not cover the intelligence flow in order`);
    }
    for (const stage of scenario.stages) {
      if (!ids.has(stage.subsystemId)) {
        issues.push(`scenario ${scenario.id} references unknown subsystem ${stage.subsystemId}`);
      }
    }
    if (scenario.impact.length === 0) issues.push(`scenario ${scenario.id} has no impact metrics`);
  }

  for (const useCase of useCases) {
    for (const subId of useCase.primarySubsystems) {
      if (!ids.has(subId)) issues.push(`use case ${useCase.id} references unknown subsystem ${subId}`);
    }
    for (const scenarioId of useCase.scenarioIds) {
      if (!scenarioIds.has(scenarioId)) {
        issues.push(`use case ${useCase.id} references unknown scenario ${scenarioId}`);
      }
    }
  }

  return { ok: issues.length === 0, issues };
}
