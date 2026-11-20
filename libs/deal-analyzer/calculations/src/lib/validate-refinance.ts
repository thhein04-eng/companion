import type {
  FieldError,
  LoanScenario,
  RefinanceAssumptions,
} from 'shared-calculations';
import type { ResolvedRefinanceAssumptions } from './types';

/** Defaults for the scenario-level refinance inputs (spec 014 data-model §A). */
export const DEFAULT_REFINANCE = {
  mode: 'cash-out',
  ltvPct: 75,
  refinanceMonth: 12,
  /** The new term when none is stored in Cash-out mode (Rate-drop defaults to the months left). */
  cashOutTermMonths: 360,
  closingCosts: 0,
  termUnit: 'years',
} as const;

type Rule = {
  field: Extract<FieldError['field'], `refinance.${string}`>;
  read: (r: RefinanceAssumptions) => unknown;
  valid: (n: number) => boolean;
  message: string;
};

const RULES: Rule[] = [
  {
    field: 'refinance.arvDollars',
    read: (r) => r.arvDollars,
    valid: (n) => n > 0,
    message: 'Enter an after-repair value greater than $0.',
  },
  {
    field: 'refinance.ltvPct',
    read: (r) => r.ltvPct,
    valid: (n) => n >= 1 && n <= 95,
    message: 'Loan-to-value must be between 1% and 95%.',
  },
  {
    field: 'refinance.newRatePct',
    read: (r) => r.newRatePct,
    valid: (n) => n >= 0 && n <= 100,
    message: 'Enter a rate between 0% and 100%.',
  },
  {
    field: 'refinance.newTermMonths',
    read: (r) => r.newTermMonths,
    valid: (n) => Number.isInteger(n) && n >= 1 && n <= 480,
    message: 'Term must be between 1 and 480 months.',
  },
  {
    field: 'refinance.closingCostsDollars',
    read: (r) => r.closingCostsDollars,
    valid: (n) => n >= 0,
    message: "Refinance closing costs can't be negative.",
  },
  {
    field: 'refinance.refinanceMonth',
    read: (r) => r.refinanceMonth,
    // Above the loan term is not an error: `resolveRefinanceAssumptions` clamps it.
    valid: (n) => Number.isInteger(n) && n >= 1,
    message: 'Refinance month must be a whole month, 1 or more.',
  },
];

/**
 * Field errors for the stored refinance inputs that are present and invalid (spec 014 data-model
 * §E). A missing field is never an error: it is a prompt (research R12).
 */
export function validateRefinance(scenario: LoanScenario): FieldError[] {
  const refinance = (scenario.refinance ?? {}) as RefinanceAssumptions;
  const errors: FieldError[] = [];
  for (const { field, read, valid, message } of RULES) {
    const value = read(refinance);
    if (value === undefined) continue;
    if (!(
      typeof value === 'number' &&
      Number.isFinite(value) &&
      valid(value)
    )) {
      errors.push({ field, message });
    }
  }
  return errors;
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** A stored number when it passes its rule, else `undefined` (so the default applies). */
function stored(
  rule: Rule,
  refinance: RefinanceAssumptions,
): number | undefined {
  const value = rule.read(refinance);
  return isNumber(value) && rule.valid(value) ? value : undefined;
}

const rule = (field: Rule['field']): Rule => {
  const found = RULES.find((r) => r.field === field);
  if (!found) throw new Error(`No refinance rule for ${field}`);
  return found;
};

/** Stored refinance inputs over the defaults, clamped to the loan (spec 014 data-model §B). */
export function resolveRefinanceAssumptions(
  scenario: LoanScenario,
): ResolvedRefinanceAssumptions {
  const refinance = (scenario.refinance ?? {}) as RefinanceAssumptions;
  const term = Math.max(1, Math.floor(scenario.termMonths));

  const mode =
    refinance.mode === 'rate-drop' ? 'rate-drop' : DEFAULT_REFINANCE.mode;
  const storedMonth = stored(rule('refinance.refinanceMonth'), refinance);
  const wanted = storedMonth ?? DEFAULT_REFINANCE.refinanceMonth;
  const refinanceMonth = Math.min(Math.max(wanted, 1), term);
  const clampedFrom =
    storedMonth !== undefined && storedMonth > term ? storedMonth : null;
  const remainingMonths = term - refinanceMonth;

  return {
    mode,
    arv: stored(rule('refinance.arvDollars'), refinance) ?? null,
    ltvPct:
      stored(rule('refinance.ltvPct'), refinance) ?? DEFAULT_REFINANCE.ltvPct,
    newRatePct: stored(rule('refinance.newRatePct'), refinance) ?? null,
    refinanceMonth,
    clampedFrom,
    remainingMonths,
    newTermMonths:
      stored(rule('refinance.newTermMonths'), refinance) ??
      (mode === 'rate-drop'
        ? remainingMonths
        : DEFAULT_REFINANCE.cashOutTermMonths),
    termUnit:
      refinance.termUnit === 'months' ? 'months' : DEFAULT_REFINANCE.termUnit,
    closingCosts:
      stored(rule('refinance.closingCostsDollars'), refinance) ??
      DEFAULT_REFINANCE.closingCosts,
  };
}
