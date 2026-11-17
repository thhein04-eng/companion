import type { AmortizationSchedule, DealAnalysis, ScenarioComparison } from './types';

/**
 * Reduces 2+ already-computed schedules to a side-by-side summary (User Story 4).
 * `analyses` optionally maps scenario id → its `DealAnalysis` (Deal Analyzer,
 * FR-014); scenarios without one get `null` deal columns.
 */
export function compareScenarios(
  schedules: AmortizationSchedule[],
  analyses: Record<string, DealAnalysis | null> = {}
): ScenarioComparison {
  return {
    scenarioIds: schedules.map((s) => s.scenarioId),
    rows: schedules.map((schedule) => {
      const analysis = analyses[schedule.scenarioId] ?? null;
      return {
        scenarioId: schedule.scenarioId,
        monthlyPayment: schedule.summary.totalMonthlyPayment,
        totalInterest: schedule.summary.totalInterestPaid,
        totalCost: schedule.summary.totalPaid,
        payoffDate: schedule.summary.payoffDate,
        monthlyCashFlow: analysis?.cashFlow.monthly ?? null,
        annualNoi: analysis?.netOperatingIncome.annual ?? null,
        capRate: analysis?.capRate.value ?? null,
        cashOnCashReturn: analysis?.cashOnCashReturn.value ?? null,
      };
    }),
  };
}
