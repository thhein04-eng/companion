import {
  roundCents,
  type AmortizationSchedule,
  type LoanScenario,
  type RatioResult,
  type RentalAssumptions,
} from 'shared-calculations';
import { analyzeDeal } from './analyze-deal';
import { growthRates, projectRental } from './project-rental';
import { operatingYear } from './operating-year';
import type { WealthProjection, WealthYear } from './types';
import { resolveWealthAssumptions, validateWealth } from './validate-wealth';

export { DEFAULT_WEALTH } from './validate-wealth';

/** Residential rental property recovery period, straight-line (spec 008 FR-007). */
export const DEPRECIATION_YEARS = 27.5;

/** "Use typical rates" (spec 008 FR-013). */
export const TYPICAL_GROWTH = {
  appreciationPct: 3,
  rentGrowthPct: 2.5,
  expenseGrowthPct: 2.5,
} as const;

export const WEALTH_NO_PRICE_REASON =
  'Enter a purchase price to project equity and net worth.';
export const WEALTH_INVALID_REASON =
  'Fix the projection assumptions to see the projection.';
export const WEALTH_TAX_INVALID_REASON =
  'Fix the tax assumptions to see after-tax figures.';

const TAX_FIELDS = new Set([
  'rental.wealth.landValuePct',
  'rental.wealth.marginalTaxRatePct',
]);

/**
 * Year-by-year wealth projection (spec 008, research R1–R7).
 *
 * Same preconditions as `analyzeDeal`: a valid scenario with a valid `rental`,
 * and `schedule = computeSchedule(scenario)`. Years inside the loan term reuse
 * `projectRental` for NOI, cash flow and balance, so this page and the Deal
 * Analyzer's charts always agree.
 */
export function projectWealth(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
  options?: { horizonYears?: number },
): WealthProjection {
  const rental = scenario.rental as RentalAssumptions;
  const assumptions = resolveWealthAssumptions(rental);
  const errors = validateWealth(rental);
  const deal = analyzeDeal(scenario, schedule);
  const totalCashInvested = deal.totalCashInvested;
  // Spec 009 T007: a caller-chosen horizon (the exit's hold) replaces the stored one, so an
  // invalid stored horizon no longer blocks; it stays in `errors` for /wealth to show.
  const horizonYears = options?.horizonYears ?? assumptions.horizonYears;
  const blocking = (field: string) =>
    !TAX_FIELDS.has(field) &&
    !(options?.horizonYears != null && field === 'rental.wealth.horizonYears');

  const empty = (naReason: string): WealthProjection => ({
    years: null,
    naReason,
    horizonYears,
    depreciableBasis: null,
    totalCashInvested,
    multiple: { value: null, naReason },
    taxNaReason: null,
    errors,
  });

  const price =
    scenario.homePrice != null && scenario.homePrice > 0
      ? scenario.homePrice
      : null;
  if (price == null) return empty(WEALTH_NO_PRICE_REASON);
  if (errors.some((e) => blocking(e.field))) {
    return empty(WEALTH_INVALID_REASON);
  }

  const taxValid = !errors.some((e) => TAX_FIELDS.has(e.field));
  const rates = growthRates(rental);
  const forced = assumptions.forcedAppreciation;
  const loan = scenario.principal;
  const rentalYears = projectRental(scenario, schedule).years;

  // Depreciation (R5): basis = building share of the price + rehab.
  const basis = roundCents(
    price * (1 - assumptions.landValuePct / 100) + rental.rehabBudget,
  );
  const annualDepreciation = roundCents(basis / DEPRECIATION_YEARS);
  const taxRate = assumptions.marginalTaxRatePct / 100;
  const initialEquity = roundCents(price - loan);

  const rows: WealthYear[] = [];
  const valueAt = (year: number) =>
    roundCents((price + forced) * (1 + rates.appreciation) ** year);

  const v0 = valueAt(0);
  rows.push({
    year: 0,
    propertyValue: v0,
    loanBalance: loan,
    equity: roundCents(v0 - loan),
    initialEquity,
    forcedAppreciation: forced,
    marketAppreciation: roundCents(v0 - price - forced),
    principalPaid: 0,
    noi: 0,
    cashFlow: 0,
    cumulativeCashFlow: 0,
    interest: 0,
    depreciation: 0,
    taxableIncome: taxValid ? 0 : null,
    taxEffect: taxValid ? 0 : null,
    cumulativeTaxEffect: taxValid ? 0 : null,
    netWorth: roundCents(v0 - loan),
    netWorthAfterTax: taxValid ? roundCents(v0 - loan) : null,
  });

  let cumulativeCashFlow = 0;
  let cumulativeTax = 0;
  let depreciated = 0;

  for (let year = 1; year <= horizonYears; year++) {
    let noi: number;
    let cashFlow: number;
    let loanBalance: number;
    const inTerm = rentalYears[year - 1];
    if (inTerm) {
      ({ noi, cashFlow, loanBalance } = inTerm);
    } else {
      // Past the loan term (R1): same growth rule as projectRental, no debt.
      const { gsiMonthly, opexMonthly } = operatingYear(scenario, year);
      noi = roundCents((gsiMonthly - opexMonthly) * 12);
      cashFlow = noi;
      loanBalance = 0;
    }

    const propertyValue = valueAt(year);
    const equity = roundCents(propertyValue - loanBalance);
    cumulativeCashFlow = roundCents(cumulativeCashFlow + cashFlow);
    const netWorth = roundCents(equity + cumulativeCashFlow);

    // Interest (R6): scheduled interest in the year's periods; 0 after payoff.
    const interest = roundCents(
      schedule.periods
        .slice((year - 1) * 12, year * 12)
        .reduce((sum, p) => sum + p.interestPortion, 0),
    );
    const depreciation = roundCents(
      Math.max(0, Math.min(annualDepreciation, basis - depreciated)),
    );
    depreciated = roundCents(depreciated + depreciation);

    let taxableIncome: number | null = null;
    let taxEffect: number | null = null;
    if (taxValid) {
      taxableIncome = roundCents(noi - interest - depreciation);
      // R7: positive = tax saved. `+ 0` normalizes −0.
      taxEffect = roundCents(-taxableIncome * taxRate) + 0;
      cumulativeTax = roundCents(cumulativeTax + taxEffect);
    }

    rows.push({
      year,
      propertyValue,
      loanBalance,
      equity,
      initialEquity,
      forcedAppreciation: forced,
      marketAppreciation: roundCents(propertyValue - price - forced),
      principalPaid: roundCents(loan - loanBalance),
      noi,
      cashFlow,
      cumulativeCashFlow,
      interest,
      depreciation,
      taxableIncome,
      taxEffect,
      cumulativeTaxEffect: taxValid ? cumulativeTax : null,
      netWorth,
      netWorthAfterTax: taxValid ? roundCents(netWorth + cumulativeTax) : null,
    });
  }

  const finalNetWorth = rows[rows.length - 1].netWorth;
  const multiple: RatioResult =
    totalCashInvested > 0
      ? { value: finalNetWorth / totalCashInvested, naReason: null }
      : {
          value: null,
          naReason: 'No cash invested — Cash-on-Cash Return is undefined.',
        };

  return {
    years: rows,
    naReason: null,
    horizonYears,
    depreciableBasis: taxValid ? basis : null,
    totalCashInvested,
    multiple,
    taxNaReason: taxValid ? null : WEALTH_TAX_INVALID_REASON,
    errors,
  };
}
