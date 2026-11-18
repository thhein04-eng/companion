import type {
  FieldError,
  RentalAssumptions,
  WealthAssumptions,
} from 'shared-calculations';

/** Defaults for every wealth assumption (spec 008 FR-015, data-model §A). */
export const DEFAULT_WEALTH: Required<WealthAssumptions> = {
  horizonYears: 10,
  forcedAppreciation: 0,
  landValuePct: 20,
  marginalTaxRatePct: 24,
};

type WealthField = keyof WealthAssumptions;

const RULES: {
  field: WealthField;
  valid: (v: number) => boolean;
  message: string;
}[] = [
  {
    field: 'horizonYears',
    valid: (v) => Number.isInteger(v) && v >= 1 && v <= 30,
    message: 'Horizon must be 1 to 30 whole years.',
  },
  {
    field: 'forcedAppreciation',
    valid: (v) => v >= 0,
    message: 'Forced appreciation cannot be negative.',
  },
  {
    field: 'landValuePct',
    valid: (v) => v >= 0 && v < 100,
    message: 'Land value must be at least 0% and less than 100%.',
  },
  {
    field: 'marginalTaxRatePct',
    valid: (v) => v >= 0 && v <= 60,
    message: 'Tax rate must be between 0% and 60%.',
  },
];

/** Stored wealth assumptions merged over the defaults; `undefined` fields take the default. */
export function resolveWealthAssumptions(
  rental: RentalAssumptions,
): Required<WealthAssumptions> {
  const stored = (rental.wealth ?? {}) as WealthAssumptions;
  const resolved = { ...DEFAULT_WEALTH };
  for (const field of Object.keys(DEFAULT_WEALTH) as WealthField[]) {
    const value = stored[field];
    if (value !== undefined) resolved[field] = value as number;
  }
  return resolved;
}

/**
 * Validates the stored wealth assumptions (spec 008 FR-014). Only present fields
 * are checked; never throws on malformed values.
 */
export function validateWealth(rental: RentalAssumptions): FieldError[] {
  const stored = (rental.wealth ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  for (const { field, valid, message } of RULES) {
    const value = stored[field];
    if (value === undefined) continue;
    if (!(typeof value === 'number' && Number.isFinite(value) && valid(value))) {
      errors.push({ field: `rental.wealth.${field}`, message });
    }
  }
  return errors;
}
