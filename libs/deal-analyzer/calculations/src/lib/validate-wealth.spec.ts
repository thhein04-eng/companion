import { describe, expect, it } from 'vitest';
import {
  computeSchedule,
  type RentalAssumptions,
  type WealthAssumptions,
} from 'shared-calculations';
import { projectWealth } from './project-wealth';
import { validateWealth } from './validate-wealth';
import { referenceScenario } from './__fixtures__/dscr-reference';

const base = referenceScenario().rental as RentalAssumptions;
const withWealth = (wealth: unknown): RentalAssumptions => ({
  ...base,
  wealth: wealth as WealthAssumptions,
});

describe('validateWealth (spec 008 FR-014, data-model §A)', () => {
  it('accepts missing or null assumptions', () => {
    expect(validateWealth(base)).toEqual([]);
    expect(validateWealth(withWealth(null))).toEqual([]);
    expect(validateWealth(withWealth({}))).toEqual([]);
  });

  it.each<[string, unknown[], string]>([
    ['horizonYears', [0, 31, 7.5, Number.NaN, '10'], 'Horizon must be 1 to 30 whole years.'],
    ['forcedAppreciation', [-1, Number.POSITIVE_INFINITY], 'Forced appreciation cannot be negative.'],
    ['landValuePct', [100, -1, '20'], 'Land value must be at least 0% and less than 100%.'],
    ['marginalTaxRatePct', [61, -1], 'Tax rate must be between 0% and 60%.'],
  ])('%s rejects %o', (field, values, message) => {
    for (const value of values) {
      expect(validateWealth(withWealth({ [field]: value }))).toEqual([
        { field: `rental.wealth.${field}`, message },
      ]);
    }
  });

  it('accepts boundary values', () => {
    expect(
      validateWealth(
        withWealth({
          horizonYears: 30,
          forcedAppreciation: 0,
          landValuePct: 0,
          marginalTaxRatePct: 60,
        }),
      ),
    ).toEqual([]);
  });

  it('blanks the projection for an invalid horizon', () => {
    const s = referenceScenario({}, { wealth: { horizonYears: 31 } });
    const projection = projectWealth(s, computeSchedule(s));
    expect(projection.years).toBeNull();
    expect(projection.naReason).toBe(
      'Fix the projection assumptions to see the projection.',
    );
    expect(projection.errors).toContainEqual({
      field: 'rental.wealth.horizonYears',
      message: 'Horizon must be 1 to 30 whole years.',
    });
  });
});
