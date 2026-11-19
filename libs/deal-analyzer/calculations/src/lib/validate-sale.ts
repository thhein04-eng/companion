import type {
  FieldError,
  LoanScenario,
  SaleAssumptions,
  SaleTaxAssumptions,
} from 'shared-calculations';
import type { ResolvedSaleAssumptions } from './types';
import {
  DEFAULT_EXIT,
  resolveExitAssumptions,
  validateExit,
} from './validate-exit';
import { resolveWealthAssumptions } from './validate-wealth';

/** Defaults for the scenario-level sale inputs (spec 013 data-model §A). */
export const DEFAULT_SALE = {
  exitUnit: 'years',
  appreciationPct: 0,
  sellingCostsPct: 7,
} as const;

/** The tax estimate is off by default (FR-009). */
export const DEFAULT_SALE_TAX = {
  enabled: false,
  capitalGainsRatePct: 15,
  recaptureRatePct: 25,
} as const;

/** The exit when there is no rental hold to default from (research R2). */
export const SALE_NON_RENTAL_DEFAULT_MONTHS = DEFAULT_EXIT.holdYears * 12;

type Rule = {
  field: FieldError['field'];
  read: (sale: SaleAssumptions) => unknown;
  valid: (v: number) => boolean;
  message: string;
};

const tax = (sale: SaleAssumptions) =>
  (sale.tax ?? {}) as Record<keyof SaleTaxAssumptions, unknown>;

const RULES: Rule[] = [
  {
    field: 'sale.exitMonth',
    read: (s) => s.exitMonth,
    valid: (v) => Number.isInteger(v) && v >= 1,
    message: 'Exit must be a whole number of months, at least 1.',
  },
  {
    field: 'sale.appreciationPct',
    read: (s) => s.appreciationPct,
    valid: (v) => v >= -10 && v <= 25,
    message: 'Appreciation must be between −10% and 25%.',
  },
  {
    field: 'sale.sellingCostsPct',
    read: (s) => s.sellingCostsPct,
    valid: (v) => v >= 0 && v <= 15,
    message: 'Selling costs must be between 0% and 15%.',
  },
  {
    field: 'sale.tax.capitalGainsRatePct',
    read: (s) => tax(s).capitalGainsRatePct,
    valid: (v) => v >= 0 && v <= 40,
    message: 'Capital gains rate must be between 0% and 40%.',
  },
  {
    field: 'sale.tax.recaptureRatePct',
    read: (s) => tax(s).recaptureRatePct,
    valid: (v) => v >= 0 && v <= 40,
    message: 'Recapture rate must be between 0% and 40%.',
  },
];

/** The tax-rate fields: invalid ones only hide the tax estimate (FR-011). */
export const SALE_TAX_FIELDS: ReadonlySet<string> = new Set([
  'sale.tax.capitalGainsRatePct',
  'sale.tax.recaptureRatePct',
]);

/**
 * Validates the present `scenario.sale` fields; never throws. Tax rates are validated even
 * while the estimate is off, so their inputs can show the error. An exit past the loan term
 * is clamped by `resolveSaleAssumptions`, not reported here.
 */
export function validateSale(scenario: LoanScenario): FieldError[] {
  const sale = (scenario.sale ?? {}) as SaleAssumptions;
  const errors: FieldError[] = [];
  for (const { field, read, valid, message } of RULES) {
    const value = read(sale);
    if (value === undefined) continue;
    if (!(typeof value === 'number' && Number.isFinite(value) && valid(value))) {
      errors.push({ field, message });
    }
  }
  return errors;
}

const numberOr = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** Stored sale inputs over the defaults, with shared rental fields and clamping (data-model §B). */
export function resolveSaleAssumptions(
  scenario: LoanScenario,
): ResolvedSaleAssumptions {
  const sale = (scenario.sale ?? {}) as SaleAssumptions;
  const rental = scenario.rental ?? null;
  const term = Math.max(1, Math.floor(scenario.termMonths));

  let defaultMonths = SALE_NON_RENTAL_DEFAULT_MONTHS;
  if (rental) {
    const holdValid = !validateExit(rental).some(
      (e) => e.field === 'rental.exit.holdYears',
    );
    if (holdValid) defaultMonths = resolveExitAssumptions(rental).holdYears * 12;
  }

  const stored = sale.exitMonth;
  const hasStored =
    typeof stored === 'number' && Number.isInteger(stored) && stored >= 1;
  const wanted = hasStored ? stored : defaultMonths;
  const exitMonth = Math.min(Math.max(wanted, 1), term);
  const clampedFrom = hasStored && stored > term ? stored : null;

  const storedTax = (sale.tax ?? {}) as SaleTaxAssumptions;

  return {
    mode: rental ? 'rental' : 'non-rental',
    exitMonth,
    clampedFrom,
    exitUnit: sale.exitUnit === 'months' ? 'months' : 'years',
    appreciationPct: rental
      ? (rental.appreciationPct ?? 0)
      : numberOr(sale.appreciationPct, DEFAULT_SALE.appreciationPct),
    sellingCostsPct: rental
      ? resolveExitAssumptions(rental).sellingCostsPct
      : numberOr(sale.sellingCostsPct, DEFAULT_SALE.sellingCostsPct),
    tax: {
      enabled: storedTax.enabled === true,
      capitalGainsRatePct: numberOr(
        storedTax.capitalGainsRatePct,
        DEFAULT_SALE_TAX.capitalGainsRatePct,
      ),
      recaptureRatePct: numberOr(
        storedTax.recaptureRatePct,
        DEFAULT_SALE_TAX.recaptureRatePct,
      ),
      landValuePct: rental ? resolveWealthAssumptions(rental).landValuePct : null,
    },
  };
}
