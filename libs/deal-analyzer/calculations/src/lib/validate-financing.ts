import type {
  FieldError,
  FinancingOptionId,
  FinancingTerms,
  RentalAssumptions,
} from 'shared-calculations';
import { resolveDscrMinimum } from './dscr';

/**
 * Validates the stored minimum DSCR (spec 006 FR-002). A missing value is valid
 * (it defaults to 1.25). Kept apart from `validateRental` so it never blocks the
 * Deal Analyzer (research R11).
 */
export function validateDscrMinimum(
  rental: RentalAssumptions | null | undefined,
): FieldError[] {
  if (!rental || rental.dscrMinimum === undefined) return [];
  return resolveDscrMinimum(rental) === null
    ? [
        {
          field: 'rental.dscrMinimum',
          message: 'Minimum DSCR must be between 1.00 and 2.00.',
        },
      ]
    : [];
}

const OPTION_IDS: FinancingOptionId[] = ['conventional', 'arm', 'dscr'];
const ARM_FIXED_PERIODS = [3, 5, 7, 10];

const DOWN_PAYMENT_MESSAGE =
  'Down payment must be at least 0% and less than 100%.';
const RATE_MESSAGE = 'Rate must be between 0% and 25%.';
const TERM_MESSAGE = 'Term must be 1 to 40 whole years.';
const FIXED_PERIOD_MESSAGE = 'Fixed period must be shorter than the term.';

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRate(value: unknown): boolean {
  return isNumber(value) && value >= 0 && value <= 25;
}

/**
 * Validates the financing-matrix terms (spec 006 FR-011, data-model §A).
 * Returns one error per offending field, keyed `rental.financing.{id}.{field}`,
 * plus the minimum-DSCR error. Never throws on malformed stored values.
 */
export function validateFinancing(
  rental: RentalAssumptions,
  terms: FinancingTerms,
): FieldError[] {
  const errors: FieldError[] = [...validateDscrMinimum(rental)];

  for (const id of OPTION_IDS) {
    const option = (terms as Partial<FinancingTerms> | null)?.[id] as
      | Record<string, unknown>
      | undefined;
    const fieldError = (field: string, message: string): FieldError => ({
      field: `rental.financing.${id}.${field}`,
      message,
    });

    const down = option?.downPaymentPct;
    if (!(isNumber(down) && down >= 0 && down < 100)) {
      errors.push(fieldError('downPaymentPct', DOWN_PAYMENT_MESSAGE));
    }
    if (!isRate(option?.annualRatePct)) {
      errors.push(fieldError('annualRatePct', RATE_MESSAGE));
    }
    const term = option?.termYears;
    const termValid = Number.isInteger(term) && (term as number) >= 1 && (term as number) <= 40;
    if (!termValid) {
      errors.push(fieldError('termYears', TERM_MESSAGE));
    }

    if (id === 'arm') {
      if (!isRate(option?.adjustedRatePct)) {
        errors.push(fieldError('adjustedRatePct', RATE_MESSAGE));
      }
      const fixed = option?.fixedPeriodYears;
      const fixedValid =
        ARM_FIXED_PERIODS.includes(fixed as number) &&
        (!termValid || (fixed as number) < (term as number));
      if (!fixedValid) {
        errors.push(fieldError('fixedPeriodYears', FIXED_PERIOD_MESSAGE));
      }
    }
  }

  return errors;
}
