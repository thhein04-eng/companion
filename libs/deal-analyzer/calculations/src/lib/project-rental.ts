import {
  roundCents,
  type AmortizationSchedule,
  type LoanScenario,
  type RentalAssumptions,
} from 'shared-calculations';
import { analyzeDeal } from './analyze-deal';
import { rentalLineItems } from './rental-line-items';
import type { RentalProjection, RentalYear } from './types';

export const EQUITY_NA_REASON =
  'Enter a purchase price to see equity build-up.';

/** The three growth rates as fractions, treating a missing (pre-feature) value as 0% (FR-013). */
export function growthRates(rental: RentalAssumptions): {
  rent: number;
  expense: number;
  appreciation: number;
} {
  return {
    rent: (rental.rentGrowthPct ?? 0) / 100,
    expense: (rental.expenseGrowthPct ?? 0) / 100,
    appreciation: (rental.appreciationPct ?? 0) / 100,
  };
}

/**
 * Year-by-year rental projection over the full loan term (US6, FR-011; research R11/R12).
 *
 * Same preconditions as `analyzeDeal`: a valid scenario with a valid `rental`, and
 * `schedule = computeSchedule(scenario)`. Year 1 reproduces `analyzeDeal` exactly, because both
 * use `rentalLineItems` and the same rounding order.
 *
 * - Income grows by rent growth; percent-of-income expense lines follow income.
 * - Property tax, insurance, HOA and custom expenses grow by expense growth.
 * - Debt service = scheduled P&I × periods in the year + PMI × PMI periods in the year (never extra
 *   principal), so it is 0 after an early payoff. Like `analyzeDeal`, the payoff year counts a full
 *   scheduled P&I for each of its periods even though the final payment may be smaller.
 * - Cash-on-cash divides each year's cash flow by the initial total cash invested.
 * - Equity: initial equity (price − loan) + principal paid down + appreciation, which always equals
 *   home value − loan balance. Principal paid is `loan − balance`, so the identity holds to the cent.
 */
export function projectRental(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
): RentalProjection {
  const rental = scenario.rental as RentalAssumptions;
  const rates = growthRates(rental);
  const deal = analyzeDeal(scenario, schedule);
  const years = Math.ceil(scenario.termMonths / 12);
  const homePrice =
    scenario.homePrice != null && scenario.homePrice > 0
      ? scenario.homePrice
      : null;
  const { monthlyPrincipalAndInterest, monthlyPmiAmount } = schedule.summary;
  const baseGsiMonthly = rental.grossMonthlyRent + rental.otherMonthlyIncome;

  const rows: RentalYear[] = [];
  for (let year = 1; year <= years; year++) {
    const gsiMonthly = baseGsiMonthly * (1 + rates.rent) ** (year - 1);
    const lines = rentalLineItems(
      scenario,
      gsiMonthly,
      (1 + rates.expense) ** (year - 1),
    );
    const opexMonthly = lines.reduce((sum, line) => sum + line.monthly, 0);
    const noiMonthly = gsiMonthly - opexMonthly;

    const periods = schedule.periods.slice((year - 1) * 12, year * 12);
    const pmiPeriods = periods.filter((p) => p.pmiApplies).length;
    const debtService = roundCents(
      monthlyPrincipalAndInterest * periods.length +
        monthlyPmiAmount * pmiPeriods,
    );
    const cashFlow = roundCents(noiMonthly * 12 - debtService);

    const lastIndex = Math.min(year * 12, schedule.periods.length) - 1;
    const loanBalance =
      year * 12 > schedule.periods.length
        ? 0
        : schedule.periods[lastIndex].remainingBalance;
    const homeValue =
      homePrice != null
        ? roundCents(homePrice * (1 + rates.appreciation) ** year)
        : null;

    rows.push({
      year,
      x: `Yr ${year}`,
      grossIncome: roundCents(gsiMonthly * 12),
      operatingExpenses: roundCents(opexMonthly * 12),
      noi: roundCents(noiMonthly * 12),
      debtService,
      cashFlow,
      cashOnCash:
        deal.totalCashInvested > 0 ? cashFlow / deal.totalCashInvested : null,
      homeValue,
      loanBalance,
      initialEquity:
        homePrice != null ? roundCents(homePrice - scenario.principal) : null,
      principalPaid: roundCents(scenario.principal - loanBalance),
      appreciation:
        homePrice != null && homeValue != null
          ? roundCents(homeValue - homePrice)
          : null,
    });
  }

  return {
    years: rows,
    totalCashInvested: deal.totalCashInvested,
    cashOnCashNaReason: deal.cashOnCashReturn.naReason,
    equityNaReason: homePrice == null ? EQUITY_NA_REASON : null,
  };
}
