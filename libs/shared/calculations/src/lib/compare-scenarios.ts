import type { AmortizationSchedule, ScenarioComparison } from './types';

/**
 * Reduces 2+ already-computed schedules to a side-by-side loan summary
 * (spec 001 User Story 4). Deal Analyzer columns are added on top by
 * `withDealMetrics` in `deal-analyzer-calculations` (spec 003 research R3).
 */
export function compareScenarios(
  schedules: AmortizationSchedule[],
): ScenarioComparison {
  return {
    scenarioIds: schedules.map((s) => s.scenarioId),
    rows: schedules.map((schedule) => ({
      scenarioId: schedule.scenarioId,
      monthlyPayment: schedule.summary.totalMonthlyPayment,
      totalInterest: schedule.summary.totalInterestPaid,
      totalCost: schedule.summary.totalPaid,
      payoffDate: schedule.summary.payoffDate,
    })),
  };
}
