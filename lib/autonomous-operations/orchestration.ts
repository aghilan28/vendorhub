import { detectAutonomousIncidents, groupCorrelatedIncidents } from "./incident-intelligence";
import { planCascadingFailureContainment } from "./containment";
import { evaluateAutonomousOperations, validateAutonomousOperations } from "./observability";
import { planSelfHealing } from "./self-healing";
import type { AutonomousSignalInput } from "./types";

export function orchestrateAutonomousRecovery(input: {
  signals: AutonomousSignalInput;
  failedHealingAttempts?: number;
  remediationLatencyMs?: number;
  now?: Date;
}) {
  const incidents = detectAutonomousIncidents(input.signals, input.now);
  const incidentGroups = groupCorrelatedIncidents(incidents);
  const healingPlans = incidents.map(planSelfHealing);
  const containment = planCascadingFailureContainment({ incidents, signals: input.signals });
  const telemetry = evaluateAutonomousOperations({
    incidents,
    healingPlans,
    signals: input.signals,
    failedHealingAttempts: input.failedHealingAttempts ?? 0,
    remediationLatencyMs: input.remediationLatencyMs ?? 0,
  });
  const validation = validateAutonomousOperations({
    incidents,
    healingPlans,
    signals: input.signals,
    failedHealingAttempts: input.failedHealingAttempts ?? 0,
  }, input.now);

  return {
    incidents,
    incidentGroups,
    healingPlans,
    containment,
    telemetry,
    validation,
    autonomous: validation.bounded && validation.governable && telemetry.unsafeActions === 0,
  };
}
