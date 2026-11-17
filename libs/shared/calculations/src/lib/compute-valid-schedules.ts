import { computeSchedule } from './compute-schedule';
import type { AmortizationSchedule, LoanScenario } from './types';
import { validateScenario } from './validate-scenario';

/** A scenario that passed `validateScenario`, paired with its computed schedule. */
export interface ValidScheduleEntry {
  scenario: LoanScenario;
  schedule: AmortizationSchedule;
}

/**
 * Validates each scenario and computes a schedule for the valid ones, in input
 * order; invalid scenarios are skipped. Both feature pages build their
 * scenario comparison from this (spec 003 research R3).
 */
export function computeValidSchedules(
  scenarios: LoanScenario[],
): ValidScheduleEntry[] {
  const entries: ValidScheduleEntry[] = [];
  for (const input of scenarios) {
    const result = validateScenario(input);
    if (!result.valid) continue;
    entries.push({
      scenario: result.scenario,
      schedule: computeSchedule(result.scenario),
    });
  }
  return entries;
}
