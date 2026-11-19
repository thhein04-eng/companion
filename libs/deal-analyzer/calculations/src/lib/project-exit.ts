import {
  roundCents,
  type AmortizationSchedule,
  type LoanScenario,
  type RatioResult,
  type RentalAssumptions,
} from 'shared-calculations';
import { irr } from './irr';
import { operatingYear } from './operating-year';
import { projectRental } from './project-rental';
import { projectWealth } from './project-wealth';
import type { ExitProjection, ExitReturns, ProFormaYear } from './types';
import {
  HOLD_PRESETS,
  resolveExitAssumptions,
  validateExit,
} from './validate-exit';

export const EXIT_NO_PRICE_REASON = 'Enter a purchase price to model a sale.';
export const EXIT_INVALID_REASON =
  'Fix the hold and exit assumptions to see the exit.';
const NO_INVESTMENT = 'No cash invested — returns are undefined.';
const IRR_UNDEFINED = 'IRR is undefined for these cash flows.';

/** Totals, multiple and IRR for one cash-flow series (R4, R5). */
function returns(flows: number[], net: number, invested: number): ExitReturns {
  const totalCashFlow = roundCents(flows.reduce((s, f) => s + f, 0));
  const totalNetProfit = roundCents(totalCashFlow + net - invested);
  if (!(invested > 0)) {
    const na: RatioResult = { value: null, naReason: NO_INVESTMENT };
    return { totalCashFlow, totalNetProfit, equityMultiple: na, irr: na };
  }
  const series = [-invested, ...flows];
  series[series.length - 1] += net;
  const rate = irr(series);
  return {
    totalCashFlow,
    totalNetProfit,
    equityMultiple: { value: (totalCashFlow + net) / invested, naReason: null },
    irr:
      rate == null
        ? { value: null, naReason: IRR_UNDEFINED }
        : { value: rate, naReason: null },
  };
}

/**
 * Buy, hold N years and sell (spec 009, contracts/exit-calculations.md). Same preconditions as
 * `projectWealth`: a valid scenario with a valid rental, and `schedule = computeSchedule(scenario)`.
 * Each year comes from `projectWealth`'s row (R1), so every page agrees.
 */
export function projectExit(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
  holdYears?: number,
): ExitProjection {
  const rental = scenario.rental as RentalAssumptions;
  const assumptions = resolveExitAssumptions(rental);
  const errors = validateExit(rental);
  const hold = holdYears ?? assumptions.holdYears;

  if (!(scenario.homePrice != null && scenario.homePrice > 0)) {
    return { result: null, naReason: EXIT_NO_PRICE_REASON, errors };
  }
  if (errors.length > 0) {
    return { result: null, naReason: EXIT_INVALID_REASON, errors };
  }

  const wealth = projectWealth(scenario, schedule, { horizonYears: hold });
  if (!wealth.years) {
    return {
      result: null,
      naReason: wealth.naReason,
      errors: [...errors, ...wealth.errors],
    };
  }
  const rentalYears = projectRental(scenario, schedule).years;

  const years: ProFormaYear[] = [];
  for (let y = 1; y <= hold; y++) {
    const w = wealth.years[y];
    const inTerm = rentalYears[y - 1];
    let grossIncome: number;
    let operatingExpenses: number;
    if (inTerm) {
      ({ grossIncome, operatingExpenses } = inTerm);
    } else {
      const { gsiMonthly, opexMonthly } = operatingYear(scenario, y);
      grossIncome = roundCents(gsiMonthly * 12);
      operatingExpenses = roundCents(opexMonthly * 12);
    }
    const debtService = inTerm?.debtService ?? 0;
    const extraPrincipal = roundCents(
      schedule.periods
        .slice((y - 1) * 12, y * 12)
        .reduce((sum, p) => sum + p.extraPrincipalApplied, 0),
    );
    const cashToInvestor = roundCents(w.noi - debtService - extraPrincipal);
    years.push({
      year: y,
      grossIncome,
      operatingExpenses,
      noi: w.noi,
      debtService,
      extraPrincipal,
      cashToInvestor,
      interest: w.interest,
      depreciation: w.depreciation,
      taxableIncome: w.taxableIncome,
      taxEffect: w.taxEffect,
      afterTaxCashFlow:
        w.taxEffect == null ? null : roundCents(cashToInvestor + w.taxEffect),
      loanBalance: w.loanBalance,
      propertyValue: w.propertyValue,
    });
  }

  // Sale (R3).
  const last = wealth.years[hold];
  const salePrice = last.propertyValue;
  const sellingCosts = roundCents(
    (salePrice * assumptions.sellingCostsPct) / 100,
  );
  const loanPayoff = last.loanBalance;
  const netSaleProceeds = roundCents(salePrice - sellingCosts - loanPayoff);
  const invested = wealth.totalCashInvested;

  const preTax = returns(
    years.map((y) => y.cashToInvestor),
    netSaleProceeds,
    invested,
  );
  const afterTax = wealth.taxNaReason
    ? null
    : returns(
        years.map((y) => y.afterTaxCashFlow as number),
        netSaleProceeds,
        invested,
      );

  return {
    result: {
      holdYears: hold,
      years,
      salePrice,
      sellingCosts,
      loanPayoff,
      netSaleProceeds,
      totalCashInvested: invested,
      forcedAppreciation: last.forcedAppreciation,
      preTax,
      afterTax,
      taxNaReason: wealth.taxNaReason,
    },
    naReason: null,
    errors,
  };
}

/** The exit for each hold in [5, 7, 10] plus the chosen one, ascending and unique (R6). */
export function compareHolds(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
): ExitProjection[] {
  const chosen = resolveExitAssumptions(
    scenario.rental as RentalAssumptions,
  ).holdYears;
  const holds = [...new Set<number>([...HOLD_PRESETS, chosen])].sort(
    (a, b) => a - b,
  );
  return holds.map((h) => projectExit(scenario, schedule, h));
}
