import type {
  ExitAssumptions,
  FieldError,
  RentalAssumptions,
} from 'shared-calculations';

/** Defaults for every exit assumption (spec 009 data-model §A). */
export const DEFAULT_EXIT: Required<ExitAssumptions> = {
  holdYears: 7,
  sellingCostsPct: 7,
};

/** One-click hold periods (FR-002). */
export const HOLD_PRESETS = [5, 7, 10] as const;

/** "Use example rates" (spec 009). */
export const EXAMPLE_GROWTH = {
  rentGrowthPct: 3,
  expenseGrowthPct: 2.5,
  appreciationPct: 3.5,
} as const;

type ExitField = keyof ExitAssumptions;

const RULES: {
  field: ExitField;
  valid: (v: number) => boolean;
  message: string;
}[] = [
  {
    field: 'holdYears',
    valid: (v) => Number.isInteger(v) && v >= 1 && v <= 30,
    message: 'Hold period must be 1 to 30 whole years.',
  },
  {
    field: 'sellingCostsPct',
    valid: (v) => v >= 0 && v <= 15,
    message: 'Selling costs must be between 0% and 15%.',
  },
];

/** Stored exit assumptions over the defaults; `undefined` fields take the default. */
export function resolveExitAssumptions(
  rental: RentalAssumptions,
): Required<ExitAssumptions> {
  const stored = (rental.exit ?? {}) as ExitAssumptions;
  const resolved = { ...DEFAULT_EXIT };
  for (const field of Object.keys(DEFAULT_EXIT) as ExitField[]) {
    const value = stored[field];
    if (value !== undefined) resolved[field] = value as number;
  }
  return resolved;
}

/** Validates the stored exit assumptions. Only present fields; never throws. */
export function validateExit(rental: RentalAssumptions): FieldError[] {
  const stored = (rental.exit ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  for (const { field, valid, message } of RULES) {
    const value = stored[field];
    if (value === undefined) continue;
    if (!(
      typeof value === 'number' &&
      Number.isFinite(value) &&
      valid(value)
    )) {
      errors.push({ field: `rental.exit.${field}`, message });
    }
  }
  return errors;
}
