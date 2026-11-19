import {
  currentView,
  hasOwnerUnit,
  normalizeUnits,
  rentRollIncome,
  rentRollTotal,
  roundCents,
  type AmortizationSchedule,
  type LoanScenario,
  type MonthlyAnnual,
  type OccupancyView,
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

export { DEFAULT_RENTAL_ASSUMPTIONS } from 'shared-calculations';

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
export function downPaymentDollars(scenario: LoanScenario): number {
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
  options: { view?: OccupancyView } = {},
): DealAnalysis {
  const rental = scenario.rental as RentalAssumptions;

  // Spec 012: income from the rent roll in the chosen view (stored view by default).
  const owner = hasOwnerUnit(rental);
  const view = options.view ?? currentView(rental);
  const income = rentRollIncome(rental, view);
  const gsiMonthly = income.pctBaseMonthly;
  const reimbursementMonthly = income.reimbursementMonthly;
  const rawLines = rentalLineItems(scenario, income, 1);

  const operatingExpenses: OperatingExpenseLine[] = rawLines.map(
    ({ category, label, monthly }) => ({
      category,
      label,
      ...fromMonthly(monthly),
    }),
  );
  const opexMonthly = rawLines.reduce((sum, line) => sum + line.monthly, 0);
  const noiMonthly = gsiMonthly + reimbursementMonthly - opexMonthly;

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
  // The rules of thumb judge the property, so they always use the full rent roll with the owner's
  // unit at its rent after move-out (spec 012 FR-015).
  const fullRent = rentRollTotal(rental);
  const full =
    view === 'afterMoveOut' || !owner
      ? { gsiMonthly, opexMonthly }
      : (() => {
          const fullIncome = rentRollIncome(rental, 'afterMoveOut');
          return {
            gsiMonthly: fullIncome.pctBaseMonthly,
            opexMonthly: rentalLineItems(scenario, fullIncome, 1).reduce(
              (sum, line) => sum + line.monthly,
              0,
            ),
          };
        })();
  const onePercentRule: OnePercentRuleResult | null =
    purchasePrice != null
      ? {
          pass: fullRent >= 0.01 * purchasePrice,
          targetRent: roundCents(0.01 * purchasePrice),
          actualRent: fullRent,
        }
      : null;
  const fiftyPercentRule: FiftyPercentRuleResult | null =
    full.gsiMonthly > 0
      ? {
          opexRatio: full.opexMonthly / full.gsiMonthly,
          withinRule: full.opexMonthly / full.gsiMonthly <= 0.5,
          estimatedMonthlyCashFlow: roundCents(
            0.5 * full.gsiMonthly - debtService.monthly,
          ),
        }
      : null;
  const unitCount = normalizeUnits(rental).length;

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
    view: owner ? view : null,
    income: {
      rent: fromMonthly(income.rentMonthly),
      other: fromMonthly(income.otherMonthly),
      reimbursements: fromMonthly(reimbursementMonthly),
    },
    unitBreakdown:
      unitCount >= 2
        ? income.units.map((u) => ({
            id: u.id,
            name: u.name,
            rent: roundCents(u.effectiveRent),
            vacancy: roundCents(u.vacancyMonthly),
            ratePct: u.rate,
          }))
        : [],
    // What living there costs the owner each month (spec 012 FR-014): −cash flow.
    netHousingCost:
      owner && view === 'living'
        ? { monthly: -cashFlow.monthly, annual: -cashFlow.annual }
        : null,
    dscr: computeDscr({
      scenario,
      annualNoi: netOperatingIncome.annual,
      monthlyPrincipalAndInterest: schedule.summary.monthlyPrincipalAndInterest,
      minimum: resolveDscrMinimum(rental),
    }),
  };
}
