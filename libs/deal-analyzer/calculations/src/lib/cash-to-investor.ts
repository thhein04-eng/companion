import {
  roundCents,
  type AmortizationSchedule,
  type LoanScenario,
} from 'shared-calculations';
import { operatingYear } from './operating-year';
import { projectRental } from './project-rental';

/** One operating year's cash, as `projectExit` (spec 009 R2) and `analyzeSale` (spec 013 R5) use it. */
export interface OperatingCashYear {
  year: number;
  grossIncome: number;
  operatingExpenses: number;
  /** Same NOI as `projectWealth`: `projectRental` in the term, `operatingYear` past it. */
  noi: number;
  /** Scheduled P&I + PMI; 0 past the term. */
  debtService: number;
  /** Σ extraPrincipalApplied in the year. */
  extraPrincipal: number;
  /** noi − debtService − extraPrincipal */
  cashToInvestor: number;
}

/**
 * Years 1…`years` of operating cash. Internal to this lib (not exported from `index.ts`).
 * Precondition: a valid scenario with a valid rental, and `schedule = computeSchedule(scenario)`.
 */
export function operatingCashYears(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
  years: number,
): OperatingCashYear[] {
  const rentalYears = projectRental(scenario, schedule).years;
  const rows: OperatingCashYear[] = [];
  for (let y = 1; y <= years; y++) {
    const inTerm = rentalYears[y - 1];
    let grossIncome: number;
    let operatingExpenses: number;
    let noi: number;
    if (inTerm) {
      ({ grossIncome, operatingExpenses, noi } = inTerm);
    } else {
      const { gsiMonthly, opexMonthly } = operatingYear(scenario, y);
      grossIncome = roundCents(gsiMonthly * 12);
      operatingExpenses = roundCents(opexMonthly * 12);
      noi = roundCents((gsiMonthly - opexMonthly) * 12);
    }
    const debtService = inTerm?.debtService ?? 0;
    const extraPrincipal = roundCents(
      schedule.periods
        .slice((y - 1) * 12, y * 12)
        .reduce((sum, p) => sum + p.extraPrincipalApplied, 0),
    );
    rows.push({
      year: y,
      grossIncome,
      operatingExpenses,
      noi,
      debtService,
      extraPrincipal,
      cashToInvestor: roundCents(noi - debtService - extraPrincipal),
    });
  }
  return rows;
}

/** Cash to investor for years 1…`years` (spec 013 R5). */
export function annualCashToInvestor(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
  years: number,
): number[] {
  return operatingCashYears(scenario, schedule, years).map(
    (y) => y.cashToInvestor,
  );
}
