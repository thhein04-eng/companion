import { describe, expect, it } from 'vitest';
import type { FinancingTerms, RentalAssumptions } from 'shared-calculations';
import { validateFinancing } from './validate-financing';
import {
  REFERENCE_TERMS,
  referenceScenario,
} from './__fixtures__/dscr-reference';

const rental = referenceScenario().rental as RentalAssumptions;

type Patch = {
  [K in keyof FinancingTerms]?: Partial<FinancingTerms[K]>;
};

function withTerms(patch: Patch): FinancingTerms {
  return {
    conventional: { ...REFERENCE_TERMS.conventional, ...patch.conventional },
    arm: { ...REFERENCE_TERMS.arm, ...patch.arm },
    dscr: { ...REFERENCE_TERMS.dscr, ...patch.dscr },
  } as FinancingTerms;
}

describe('validateFinancing (spec 006 FR-011, data-model §A)', () => {
  it('accepts the reference terms', () => {
    expect(validateFinancing(rental, REFERENCE_TERMS)).toEqual([]);
  });

  it.each<[string, Patch, string, string]>([
    [
      'down payment of 100%',
      { conventional: { downPaymentPct: 100 } },
      'rental.financing.conventional.downPaymentPct',
      'Down payment must be at least 0% and less than 100%.',
    ],
    [
      'negative down payment',
      { dscr: { downPaymentPct: -1 } },
      'rental.financing.dscr.downPaymentPct',
      'Down payment must be at least 0% and less than 100%.',
    ],
    [
      'rate above 25%',
      { arm: { annualRatePct: 26 } },
      'rental.financing.arm.annualRatePct',
      'Rate must be between 0% and 25%.',
    ],
    [
      'negative adjusted rate',
      { arm: { adjustedRatePct: -0.5 } },
      'rental.financing.arm.adjustedRatePct',
      'Rate must be between 0% and 25%.',
    ],
    [
      'fractional term',
      { conventional: { termYears: 30.5 } },
      'rental.financing.conventional.termYears',
      'Term must be 1 to 40 whole years.',
    ],
    [
      'term over 40 years',
      { conventional: { termYears: 41 } },
      'rental.financing.conventional.termYears',
      'Term must be 1 to 40 whole years.',
    ],
    [
      'unsupported fixed period',
      { arm: { fixedPeriodYears: 6 as 7 } },
      'rental.financing.arm.fixedPeriodYears',
      'Fixed period must be shorter than the term.',
    ],
    [
      'fixed period not shorter than the term',
      { arm: { termYears: 5, fixedPeriodYears: 7 } },
      'rental.financing.arm.fixedPeriodYears',
      'Fixed period must be shorter than the term.',
    ],
  ])('rejects %s', (_name, patch, field, message) => {
    expect(validateFinancing(rental, withTerms(patch))).toEqual([
      { field, message },
    ]);
  });

  it('includes the minimum-DSCR error', () => {
    expect(
      validateFinancing({ ...rental, dscrMinimum: 2.5 }, REFERENCE_TERMS),
    ).toEqual([
      {
        field: 'rental.dscrMinimum',
        message: 'Minimum DSCR must be between 1.00 and 2.00.',
      },
    ]);
  });

  it('reports malformed stored terms without throwing', () => {
    const malformed = {
      conventional: {},
      arm: { ...REFERENCE_TERMS.arm, annualRatePct: '7' },
    } as unknown as FinancingTerms;
    const errors = validateFinancing(rental, malformed);
    const fields = errors.map((e) => e.field);
    expect(fields).toEqual(
      expect.arrayContaining([
        'rental.financing.conventional.downPaymentPct',
        'rental.financing.conventional.annualRatePct',
        'rental.financing.conventional.termYears',
        'rental.financing.arm.annualRatePct',
        'rental.financing.dscr.downPaymentPct',
      ]),
    );
    expect(() => validateFinancing(rental, null as never)).not.toThrow();
  });
});
