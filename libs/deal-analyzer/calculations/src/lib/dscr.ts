import {
  roundCents,
  type LoanScenario,
  type RentalAssumptions,
} from 'shared-calculations';
import { rentalLineItems } from './rental-line-items';
import type { DscrResult, OperatingExpenseCategory } from './types';

/** Lender minimum used when the scenario has none stored (spec 006 FR-002, research R2). */
export const DEFAULT_DSCR_MINIMUM = 1.25;
export const DSCR_MINIMUM_RANGE = { min: 1, max: 2 } as const;
export const DSCR_PRESETS = [1.15, 1.2, 1.25] as const;

const PERCENT_OF_INCOME: ReadonlySet<OperatingExpenseCategory> = new Set([
  'vacancy',
  'management',
  'maintenance',
  'capex',
]);

/** The stored minimum DSCR: 1.25 when missing, null when invalid. */
export function resolveDscrMinimum(rental: RentalAssumptions): number | null {
  const stored = rental.dscrMinimum;
  if (stored === undefined) return DEFAULT_DSCR_MINIMUM;
  return typeof stored === 'number' &&
    Number.isFinite(stored) &&
    stored >= DSCR_MINIMUM_RANGE.min &&
    stored <= DSCR_MINIMUM_RANGE.max
    ? stored
    : null;
}

/**
 * Monthly gross rent at which `NOI = minimum × annualDebtService` (research R3).
 * NOI is linear in rent: `(rent + other)(1 − p) − fixed`, where `p` is the share of
 * income taken by percentage reserves and `fixed` the monthly fixed expenses.
 */
function rentForMinimum(
  scenario: LoanScenario,
  annualDebtService: number,
  minimum: number,
): Pick<DscrResult, 'rentForMinimum' | 'rentForMinimumNaReason'> {
  const rental = scenario.rental as RentalAssumptions;
  // At gsiMonthly = 1 each percentage line's amount is its share of income.
  let share = 0;
  let fixed = 0;
  for (const line of rentalLineItems(scenario, 1, 1)) {
    if (PERCENT_OF_INCOME.has(line.category)) share += line.monthly;
    else fixed += line.monthly;
  }
  // Tolerance: percentages like 40 + 30 + 20 + 10 sum to 0.9999999999999999.
  if (share >= 1 - 1e-9) {
    return {
      rentForMinimum: null,
      rentForMinimumNaReason: 'Reserves and fees take 100% or more of rent.',
    };
  }
  const rent =
    ((minimum * annualDebtService) / 12 + fixed) / (1 - share) -
    rental.otherMonthlyIncome;
  return {
    rentForMinimum: roundCents(Math.max(0, rent)),
    rentForMinimumNaReason: null,
  };
}

/**
 * Debt Service Coverage Ratio = annual NOI ÷ (monthly P&I × 12) (spec 006 FR-001, research R1).
 * Preconditions: `scenario.rental` is non-null and valid; `annualNoi` is the Deal Analyzer's
 * year-one NOI for that scenario.
 */
export function computeDscr(input: {
  scenario: LoanScenario;
  annualNoi: number;
  monthlyPrincipalAndInterest: number;
  minimum: number | null;
}): DscrResult {
  const { scenario, annualNoi, monthlyPrincipalAndInterest, minimum } = input;
  const annualDebtService = roundCents(monthlyPrincipalAndInterest * 12);

  if (annualDebtService === 0) {
    return {
      value: null,
      naReason: 'No principal & interest — DSCR is undefined.',
      minimum,
      meetsMinimum: null,
      coversDebtService: null,
      annualDebtService,
      rentForMinimum: null,
      rentForMinimumNaReason: null,
    };
  }

  const value = annualNoi / annualDebtService;
  return {
    value,
    naReason: null,
    minimum,
    meetsMinimum: minimum == null ? null : value >= minimum,
    coversDebtService: value >= 1,
    annualDebtService,
    ...(minimum == null
      ? { rentForMinimum: null, rentForMinimumNaReason: null }
      : rentForMinimum(scenario, annualDebtService, minimum)),
  };
}
