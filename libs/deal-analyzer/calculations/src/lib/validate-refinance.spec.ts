import { describe, expect, it } from 'vitest';
import type { RefinanceAssumptions } from 'shared-calculations';
import {
  brrrrReference,
  rateDropReference,
} from './__fixtures__/refinance-reference';
import { referenceScenario } from './__fixtures__/dscr-reference';
import {
  DEFAULT_REFINANCE,
  resolveRefinanceAssumptions,
  validateRefinance,
} from './validate-refinance';

const withRefi = (refinance: RefinanceAssumptions) =>
  referenceScenario({ refinance });
const fields = (r: RefinanceAssumptions) =>
  validateRefinance(withRefi(r)).map((e) => e.field);

describe('validateRefinance (spec 014 data-model §E)', () => {
  it('reports nothing for a missing refinance or missing fields', () => {
    expect(validateRefinance(referenceScenario())).toEqual([]);
    expect(validateRefinance(referenceScenario({ refinance: null }))).toEqual(
      [],
    );
    expect(validateRefinance(withRefi({}))).toEqual([]);
  });

  it('accepts the BRRRR and rate-drop reference inputs', () => {
    expect(validateRefinance(brrrrReference())).toEqual([]);
    expect(validateRefinance(rateDropReference())).toEqual([]);
  });

  it.each<[string, RefinanceAssumptions, string, string]>([
    [
      'arvDollars',
      { arvDollars: 0 },
      'refinance.arvDollars',
      'Enter an after-repair value greater than $0.',
    ],
    [
      'arvDollars',
      { arvDollars: -5 },
      'refinance.arvDollars',
      'Enter an after-repair value greater than $0.',
    ],
    [
      'ltvPct',
      { ltvPct: 0.9 },
      'refinance.ltvPct',
      'Loan-to-value must be between 1% and 95%.',
    ],
    [
      'ltvPct',
      { ltvPct: 96 },
      'refinance.ltvPct',
      'Loan-to-value must be between 1% and 95%.',
    ],
    [
      'newRatePct',
      { newRatePct: -0.1 },
      'refinance.newRatePct',
      'Enter a rate between 0% and 100%.',
    ],
    [
      'newRatePct',
      { newRatePct: 100.5 },
      'refinance.newRatePct',
      'Enter a rate between 0% and 100%.',
    ],
    [
      'newTermMonths',
      { newTermMonths: 0 },
      'refinance.newTermMonths',
      'Term must be between 1 and 480 months.',
    ],
    [
      'newTermMonths',
      { newTermMonths: 481 },
      'refinance.newTermMonths',
      'Term must be between 1 and 480 months.',
    ],
    [
      'newTermMonths',
      { newTermMonths: 12.5 },
      'refinance.newTermMonths',
      'Term must be between 1 and 480 months.',
    ],
    [
      'closingCostsDollars',
      { closingCostsDollars: -1 },
      'refinance.closingCostsDollars',
      "Refinance closing costs can't be negative.",
    ],
    [
      'refinanceMonth',
      { refinanceMonth: 0 },
      'refinance.refinanceMonth',
      'Refinance month must be a whole month, 1 or more.',
    ],
    [
      'refinanceMonth',
      { refinanceMonth: 6.5 },
      'refinance.refinanceMonth',
      'Refinance month must be a whole month, 1 or more.',
    ],
    [
      'NaN',
      { ltvPct: Number.NaN },
      'refinance.ltvPct',
      'Loan-to-value must be between 1% and 95%.',
    ],
  ])('flags %s when invalid', (_n, input, field, message) => {
    expect(validateRefinance(withRefi(input))).toEqual([{ field, message }]);
  });

  it.each<RefinanceAssumptions>([
    { ltvPct: 1 },
    { ltvPct: 95 },
    { newRatePct: 0 },
    { newRatePct: 100 },
    { newTermMonths: 1 },
    { newTermMonths: 480 },
    { closingCostsDollars: 0 },
    { refinanceMonth: 1 },
    { arvDollars: 0.01 },
  ])('accepts the boundary value %j', (input) => {
    expect(fields(input)).toEqual([]);
  });

  it('does not treat a refinance month above the term as an error (it is clamped)', () => {
    expect(fields({ refinanceMonth: 999 })).toEqual([]);
  });
});

describe('resolveRefinanceAssumptions (spec 014 data-model §B)', () => {
  it('uses the defaults for an empty or missing refinance', () => {
    for (const s of [referenceScenario(), withRefi({})]) {
      expect(resolveRefinanceAssumptions(s)).toEqual({
        mode: 'cash-out',
        arv: null,
        ltvPct: 75,
        newRatePct: null,
        refinanceMonth: 12,
        clampedFrom: null,
        remainingMonths: 348,
        newTermMonths: 360,
        termUnit: 'years',
        closingCosts: 0,
      });
    }
    expect(DEFAULT_REFINANCE).toMatchObject({
      mode: 'cash-out',
      ltvPct: 75,
      refinanceMonth: 12,
      cashOutTermMonths: 360,
      closingCosts: 0,
      termUnit: 'years',
    });
  });

  it('passes stored values through', () => {
    const r = resolveRefinanceAssumptions(brrrrReference());
    expect(r).toMatchObject({
      mode: 'cash-out',
      arv: 320_000,
      ltvPct: 75,
      newRatePct: 6.5,
      refinanceMonth: 12,
      remainingMonths: 348,
      newTermMonths: 360,
      closingCosts: 5_000,
      clampedFrom: null,
    });
  });

  it('clamps a month above the term to the term and records where it came from', () => {
    const r = resolveRefinanceAssumptions(withRefi({ refinanceMonth: 400 }));
    expect(r.refinanceMonth).toBe(360);
    expect(r.clampedFrom).toBe(400);
    expect(r.remainingMonths).toBe(0);
  });

  it('does not report a clamp for a month equal to the term', () => {
    const r = resolveRefinanceAssumptions(withRefi({ refinanceMonth: 360 }));
    expect(r.refinanceMonth).toBe(360);
    expect(r.clampedFrom).toBeNull();
    expect(r.remainingMonths).toBe(0);
  });

  it('computes the months remaining from the refinance month', () => {
    const r = resolveRefinanceAssumptions(rateDropReference());
    expect(r.refinanceMonth).toBe(60);
    expect(r.remainingMonths).toBe(300);
  });

  it('defaults the new term to 360 in cash-out mode and to the months remaining in rate-drop mode', () => {
    expect(
      resolveRefinanceAssumptions(withRefi({ mode: 'cash-out' })).newTermMonths,
    ).toBe(360);
    expect(
      resolveRefinanceAssumptions(
        withRefi({ mode: 'rate-drop', refinanceMonth: 60 }),
      ).newTermMonths,
    ).toBe(300);
  });

  it('lets a stored new term override the mode default', () => {
    expect(
      resolveRefinanceAssumptions(
        withRefi({ mode: 'rate-drop', refinanceMonth: 60, newTermMonths: 360 }),
      ).newTermMonths,
    ).toBe(360);
  });

  it('falls back to the default for an invalid stored number', () => {
    const r = resolveRefinanceAssumptions(
      withRefi({ ltvPct: 99, refinanceMonth: 0, closingCostsDollars: -5 }),
    );
    expect(r.ltvPct).toBe(75);
    expect(r.refinanceMonth).toBe(12);
    expect(r.closingCosts).toBe(0);
  });

  it('keeps a stored months unit', () => {
    expect(
      resolveRefinanceAssumptions(withRefi({ termUnit: 'months' })).termUnit,
    ).toBe('months');
  });
});
