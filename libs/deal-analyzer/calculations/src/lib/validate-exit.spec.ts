import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RENTAL_ASSUMPTIONS,
  type RentalAssumptions,
} from 'shared-calculations';
import { resolveExitAssumptions, validateExit } from './validate-exit';

const rental = (exit?: RentalAssumptions['exit']): RentalAssumptions => ({
  ...DEFAULT_RENTAL_ASSUMPTIONS,
  grossMonthlyRent: 3_800,
  ...(exit !== undefined ? { exit } : {}),
});
const HOLD = [
  {
    field: 'rental.exit.holdYears',
    message: 'Hold period must be 1 to 30 whole years.',
  },
];
const SELLING = [
  {
    field: 'rental.exit.sellingCostsPct',
    message: 'Selling costs must be between 0% and 15%.',
  },
];

describe('validateExit (spec 009 data-model §A)', () => {
  it('accepts a missing or null exit', () => {
    expect(validateExit(rental())).toEqual([]);
    expect(validateExit(rental(null))).toEqual([]);
    expect(validateExit(rental({}))).toEqual([]);
  });

  it.each([0, 31, 7.5, '7'])('rejects holdYears %j', (holdYears) => {
    expect(validateExit(rental({ holdYears: holdYears as number }))).toEqual(
      HOLD,
    );
  });

  it.each([-1, 15.5, Number.NaN])('rejects sellingCostsPct %d', (pct) => {
    expect(validateExit(rental({ sellingCostsPct: pct }))).toEqual(SELLING);
  });

  it('accepts the boundaries', () => {
    expect(validateExit(rental({ holdYears: 30, sellingCostsPct: 0 }))).toEqual(
      [],
    );
    expect(validateExit(rental({ holdYears: 1, sellingCostsPct: 15 }))).toEqual(
      [],
    );
  });

  it('resolves defaults for an old session', () => {
    expect(resolveExitAssumptions(rental())).toEqual({
      holdYears: 7,
      sellingCostsPct: 7,
    });
  });
});
