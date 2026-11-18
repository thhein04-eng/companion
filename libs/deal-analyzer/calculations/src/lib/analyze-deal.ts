import {
  roundCents,
  type AmortizationSchedule,
  type LoanScenario,
  type MonthlyAnnual,
  type RatioResult,
  type RentalAssumptions,
} from 'shared-calculations';
import type {
  DealAnalysis,
  FiftyPercentRuleResult,
  OnePercentRuleResult,
  OperatingExpenseLine,
} from './types';
import { rentalLineItems } from './rental-line-items';
import { computeDscr, resolveDscrMinimum } from './dscr';

/** Common investor screening defaults, seeded as editable values on first rent entry (FR-002, research R3). */
export const DEFAULT_RENTAL_ASSUMPTIONS: Omit<
  RentalAssumptions,
  'grossMonthlyRent'
> = {
  otherMonthlyIncome: 0,
  vacancyPct: 5,
  managementPct: 8,
  maintenanceReservePct: 5,
  capexReservePct: 5,
  closingCosts: 0,
  rehabBudget: 0,
  customExpenses: [],
  rentGrowthPct: 0,
  expenseGrowthPct: 0,
  appreciationPct: 0,
};

/** Rounds an unrounded monthly figure per the data-model rounding rule. */
function fromMonthly(rawMonthly: number): MonthlyAnnual {
  return {
    monthly: roundCents(rawMonthly),
    annual: roundCents(rawMonthly * 12),
  };
}

/** For year-1 sums (debt service, cash flow): annual is exact, monthly is its average. */
function fromAnnual(rawAnnual: number): MonthlyAnnual {
  const annual = roundCents(rawAnnual);
  return { monthly: roundCents(annual / 12), annual };
}

/** The down payment in dollars: a percent resolves against `homePrice`; none counts as $0. */
function downPaymentDollars(scenario: LoanScenario): number {
  const down = scenario.downPayment;
  if (!down) return 0;
  if ('amount' in down) return down.amount;
  return scenario.homePrice != null
    ? (scenario.homePrice * down.percent) / 100
    : 0;
}

/**
 * Derives the investment analysis of a rental scenario (FR-003–FR-006).
 *
 * Preconditions: `scenario` passed `validateScenario`, `scenario.rental` is
 * non-null and passed `validateRental`, and `schedule = computeSchedule(scenario)`.
 * Property tax, insurance, and HOA count only as operating expenses; debt
 * service is scheduled P&I plus PMI, never extra principal (research R2).
 */
export function analyzeDeal(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
): DealAnalysis {
  const rental = scenario.rental as RentalAssumptions;

  const gsiMonthly = rental.grossMonthlyRent + rental.otherMonthlyIncome;
  const rawLines = rentalLineItems(scenario, gsiMonthly, 1);

  const operatingExpenses: OperatingExpenseLine[] = rawLines.map(
    ({ category, label, monthly }) => ({
      category,
      label,
      ...fromMonthly(monthly),
    }),
  );
  const opexMonthly = rawLines.reduce((sum, line) => sum + line.monthly, 0);
  const noiMonthly = gsiMonthly - opexMonthly;

  const yearOne = schedule.periods.slice(0, 12);
  const pmiMonths = yearOne.filter((p) => p.pmiApplies).length;
  const debtServiceAnnual =
    schedule.summary.monthlyPrincipalAndInterest *
      Math.min(12, schedule.periods.length) +
    schedule.summary.monthlyPmiAmount * pmiMonths;
  const debtService = fromAnnual(debtServiceAnnual);
  const netOperatingIncome = fromMonthly(noiMonthly);
  const cashFlow = fromAnnual(noiMonthly * 12 - debtService.annual);

  const totalCashInvested = roundCents(
    downPaymentDollars(scenario) + rental.closingCosts + rental.rehabBudget,
  );
  const cashOnCashReturn: RatioResult =
    totalCashInvested > 0
      ? { value: cashFlow.annual / totalCashInvested, naReason: null }
      : {
          value: null,
          naReason: 'No cash invested — Cash-on-Cash Return is undefined.',
        };

  // Screening metrics (FR-009–FR-011, research R4/R5).
  const purchasePrice =
    scenario.homePrice != null && scenario.homePrice > 0
      ? scenario.homePrice
      : null;
  const capRate: RatioResult =
    purchasePrice != null
      ? { value: netOperatingIncome.annual / purchasePrice, naReason: null }
      : {
          value: null,
          naReason: 'Enter a purchase price to see the cap rate.',
        };
  const onePercentRule: OnePercentRuleResult | null =
    purchasePrice != null
      ? {
          pass: rental.grossMonthlyRent >= 0.01 * purchasePrice,
          targetRent: roundCents(0.01 * purchasePrice),
          actualRent: rental.grossMonthlyRent,
        }
      : null;
  const fiftyPercentRule: FiftyPercentRuleResult | null =
    gsiMonthly > 0
      ? {
          opexRatio: opexMonthly / gsiMonthly,
          withinRule: opexMonthly / gsiMonthly <= 0.5,
          estimatedMonthlyCashFlow: roundCents(
            0.5 * gsiMonthly - debtService.monthly,
          ),
        }
      : null;

  return {
    grossScheduledIncome: fromMonthly(gsiMonthly),
    operatingExpenses,
    totalOperatingExpenses: fromMonthly(opexMonthly),
    netOperatingIncome,
    debtService,
    cashFlow,
    totalCashInvested,
    cashOnCashReturn,
    capRate,
    onePercentRule,
    fiftyPercentRule,
    pmiEndsInYearOne: pmiMonths > 0 && pmiMonths < yearOne.length,
    pmiDropPeriod: schedule.summary.pmiDropPeriod,
    dscr: computeDscr({
      scenario,
      annualNoi: netOperatingIncome.annual,
      monthlyPrincipalAndInterest: schedule.summary.monthlyPrincipalAndInterest,
      minimum: resolveDscrMinimum(rental),
    }),
  };
}
