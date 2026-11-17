import type { LoanScenario, PersistedState } from './types';

/** Serializes scenarios for the `sessionStorage` round-trip (FR-012). */
export function serializeScenarios(
  scenarios: LoanScenario[],
  activeScenarioId: string,
): string {
  const state: PersistedState = { scenarios, activeScenarioId };
  return JSON.stringify(state);
}

/**
 * Deserializes scenarios from `sessionStorage`. Never throws: missing or
 * corrupt input returns `null` so the caller can fall back to a fresh
 * default scenario.
 */
export function deserializeScenarios(
  raw: string | null,
): PersistedState | null {
  if (raw == null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray(parsed.scenarios) &&
      typeof parsed.activeScenarioId === 'string'
    ) {
      const state = parsed as PersistedState;
      return {
        ...state,
        // FR-016: sessions saved before the Deal Analyzer have no `rental` field.
        scenarios: state.scenarios.map((scenario) => ({
          ...scenario,
          rental: scenario.rental ?? null,
        })),
      };
    }
    return null;
  } catch {
    return null;
  }
}
