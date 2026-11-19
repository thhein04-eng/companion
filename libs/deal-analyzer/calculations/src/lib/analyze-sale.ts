import {
  roundCents,
  type AmortizationSchedule,
  type LoanScenario,
  type RatioResult,
} from 'shared-calculations';
import { analyzeDeal, downPaymentDollars } from './analyze-deal';
import { annualCashToInvestor } from './cash-to-investor';
import { operatingYear } from './operating-year';
import { DEPRECIATION_YEARS } from './project-wealth';
import type {
  SaleAnalysis,
  SaleBreakEven,
  SaleResult,
  SaleTaxEstimate,
} from './types';
import { validateExit } from './validate-exit';
import { validateWealth } from './validate-wealth';
import {
  resolveSaleAssumptions,
  SALE_TAX_FIELDS,
  validateSale,
} from './validate-sale';

export const SALE_NO_PRICE_REASON = 'Enter a purchase price to model a sale.';
export const SALE_INVALID_REASON = 'Fix the sale inputs to see the result.';
export const SALE_TAX_INVALID_REASON =
  'Fix the tax inputs to see the estimate.';
const NO_INVESTMENT = 'No cash invested — return is undefined.';

/** Profit / Loss / Break-even from the cents-rounded profit (spec 013 US1). */
export function saleVerdict(profit: number): SaleResult['verdict'] {
  const cents = roundCents(profit);
  if (cents > 0) return 'profit';
  if (cents < 0) return 'loss';
  return 'break-even';
}

/**
 * Net cash flow after debt service and extra principal through `exitMonth` (research R5).
 * Whole years come from `annualCashToInvestor`, so a whole-year exit equals Hold & Exit's
 * Σ cash to investor to the cent; the partial year adds each month of its operating year.
 */
function cumulativeCashFlow(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
  exitMonth: number,
): number {
  const fullYears = Math.floor(exitMonth / 12);
  let total = annualCashToInvestor(scenario, schedule, fullYears).reduce(
    (sum, cash) => sum + cash,
    0,
  );
  const { monthlyPrincipalAndInterest, monthlyPmiAmount } = schedule.summary;
  for (let k = fullYears * 12 + 1; k <= exitMonth; k++) {
    const { gsiMonthly, reimbursementMonthly, opexMonthly } = operatingYear(
      scenario,
      Math.ceil(k / 12),
    );
    const period = schedule.periods[k - 1];
    const debtService = period
      ? monthlyPrincipalAndInterest + (period.pmiApplies ? monthlyPmiAmount : 0)
      : 0;
    total +=
      gsiMonthly +
      reimbursementMonthly -
      opexMonthly -
      debtService -
      (period?.extraPrincipalApplied ?? 0);
  }
  return roundCents(total);
}

/**
 * Selling at one exit month: is it a real profit? (spec 013, contracts/sale-calculations.md).
 *
 * Preconditions: `validateScenario(scenario).valid`, `schedule = computeSchedule(scenario)`,
 * and, when `scenario.rental` exists, `validateRental(rental)` is empty.
 */
export function analyzeSale(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
): SaleAnalysis {
  const errors = validateSale(scenario);
  const rental = scenario.rental ?? null;
  const price =
    scenario.homePrice != null && scenario.homePrice > 0
      ? scenario.homePrice
      : null;

  if (price == null) {
    return { result: null, naReason: SALE_NO_PRICE_REASON, errors };
  }
  const blocking =
    errors.some((e) => !SALE_TAX_FIELDS.has(e.field)) ||
    (rental != null &&
      validateExit(rental).some(
        (e) => e.field === 'rental.exit.sellingCostsPct',
      ));
  if (blocking) {
    return { result: null, naReason: SALE_INVALID_REASON, errors };
  }

  const a = resolveSaleAssumptions(scenario);
  const m = a.exitMonth;

  // The sale (R3, R4).
  const salePrice = roundCents(
    price * (1 + a.appreciationPct / 100) ** (m / 12),
  );
  const sellingCosts = roundCents((salePrice * a.sellingCostsPct) / 100);
  const remainingBalance =
    m > schedule.periods.length ? 0 : schedule.periods[m - 1].remainingBalance;
  const netSaleProceeds = roundCents(
    salePrice - sellingCosts - remainingBalance,
  );

  // Cash flow and cash invested (R5, R6).
  const cashFlow = rental ? cumulativeCashFlow(scenario, schedule, m) : 0;
  const totalCashInvested = rental
    ? analyzeDeal(scenario, schedule).totalCashInvested
    : roundCents(downPaymentDollars(scenario));
  const totalNetProfit = roundCents(
    netSaleProceeds + cashFlow - totalCashInvested,
  );
  const returnOnCash: RatioResult =
    totalCashInvested > 0
      ? { value: totalNetProfit / totalCashInvested, naReason: null }
      : { value: null, naReason: NO_INVESTMENT };

  // Break-even (R7): profit is linear in price P, P(1 − s) − B + CF − I = 0.
  const raw =
    (remainingBalance + totalCashInvested - cashFlow) /
    (1 - a.sellingCostsPct / 100);
  const breakEvenPrice = raw < 0 ? 0 : roundCents(raw);
  const breakEven: SaleBreakEven = {
    salePrice: breakEvenPrice,
    anyPrice: raw < 0,
    cushion: roundCents(salePrice - breakEvenPrice),
    pctOfPurchase: breakEvenPrice / price,
  };

  // Tax on sale (R8): only when switched on; invalid tax inputs hide only this block.
  let tax: SaleTaxEstimate | null = null;
  let taxNaReason: string | null = null;
  if (a.tax.enabled) {
    const taxInvalid =
      errors.some((e) => SALE_TAX_FIELDS.has(e.field)) ||
      (rental != null &&
        validateWealth(rental).some(
          (e) => e.field === 'rental.wealth.landValuePct',
        ));
    if (taxInvalid) {
      taxNaReason = SALE_TAX_INVALID_REASON;
    } else {
      const rehab = rental?.rehabBudget ?? 0;
      const closing = rental?.closingCosts ?? 0;
      const basis = rental
        ? roundCents(price * (1 - (a.tax.landValuePct ?? 0) / 100) + rehab)
        : null;
      const depreciationTaken =
        basis == null
          ? 0
          : Math.min(
              basis,
              roundCents((roundCents(basis / DEPRECIATION_YEARS) * m) / 12),
            );
      const adjustedBasis = roundCents(
        price + closing + rehab - depreciationTaken,
      );
      const taxableGain = roundCents(salePrice - sellingCosts - adjustedBasis);
      const recapturedGain = Math.min(
        Math.max(taxableGain, 0),
        depreciationTaken,
      );
      const recaptureTax = roundCents(
        (recapturedGain * a.tax.recaptureRatePct) / 100,
      );
      const capitalGain = Math.max(0, roundCents(taxableGain - recapturedGain));
      const capitalGainsTax = roundCents(
        (capitalGain * a.tax.capitalGainsRatePct) / 100,
      );
      const totalTax = roundCents(recaptureTax + capitalGainsTax);
      tax = {
        depreciableBasis: basis,
        depreciationTaken,
        adjustedBasis,
        taxableGain,
        recapturedGain,
        recaptureTax,
        capitalGain,
        capitalGainsTax,
        totalTax,
        afterTaxNetProfit: roundCents(totalNetProfit - totalTax),
        shortTermWarning: m <= 12,
      };
    }
  }

  return {
    result: {
      mode: a.mode,
      exitMonth: m,
      clampedFrom: a.clampedFrom,
      salePrice,
      sellingCosts,
      remainingBalance,
      netSaleProceeds,
      cumulativeCashFlow: cashFlow,
      totalCashInvested,
      totalNetProfit,
      returnOnCash,
      verdict: saleVerdict(totalNetProfit),
      breakEven,
      forcedAppreciationNote: (rental?.wealth?.forcedAppreciation ?? 0) > 0,
      tax,
      taxNaReason,
    },
    naReason: null,
    errors,
  };
}
