import type { ScenarioComparison } from 'shared-calculations';
import type { DealAnalysis, DealScenarioComparison } from './types';

/**
 * Adds the Deal Analyzer's columns (spec 002 FR-014) to a loan comparison
 * produced by `compareScenarios`. Scenarios missing from `analyses`, or mapped
 * to `null`, get `null` deal fields.
 */
export function withDealMetrics(
  comparison: ScenarioComparison,
  analyses: Record<string, DealAnalysis | null>,
): DealScenarioComparison {
  return {
    scenarioIds: comparison.scenarioIds,
    rows: comparison.rows.map((row) => {
      const analysis = analyses[row.scenarioId] ?? null;
      return {
        ...row,
        monthlyCashFlow: analysis?.cashFlow.monthly ?? null,
        annualNoi: analysis?.netOperatingIncome.annual ?? null,
        capRate: analysis?.capRate.value ?? null,
        cashOnCashReturn: analysis?.cashOnCashReturn.value ?? null,
      };
    }),
  };
}
