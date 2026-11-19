import { describe, expect, it } from 'vitest';
import type { RentalAssumptions } from 'shared-calculations';
import { computeDscr, resolveDscrMinimum } from './dscr';
import { validateDscrMinimum } from './validate-financing';
import { analyze, referenceScenario } from './__fixtures__/dscr-reference';

function dscrFor(
  rentalOverrides: Partial<RentalAssumptions> = {},
  minimum: number | null = 1.25,
  monthlyPrincipalAndInterest = 1995.91,
) {
  const scenario = referenceScenario({}, rentalOverrides);
  return computeDscr({
    scenario,
    annualNoi: analyze(scenario).netOperatingIncome.annual,
    monthlyPrincipalAndInterest,
    minimum,
  });
}

describe('computeDscr (spec 006 FR-001–FR-004)', () => {
  it('reproduces the reference conventional loan at a 1.25 minimum', () => {
    const dscr = dscrFor();
    expect(dscr.annualDebtService).toBe(23950.92);
    expect(dscr.value?.toFixed(4)).toBe('1.1904');
    expect(dscr.naReason).toBeNull();
    expect(dscr.minimum).toBe(1.25);
    expect(dscr.meetsMinimum).toBe(false);
    expect(dscr.coversDebtService).toBe(true);
    expect(dscr.rentForMinimum).toBe(3954.4);
    expect(dscr.rentForMinimumNaReason).toBeNull();
  });

  it('passes at a 1.15 minimum', () => {
    const dscr = dscrFor({}, 1.15);
    expect(dscr.meetsMinimum).toBe(true);
    expect(dscr.rentForMinimum).toBe(3695.19);
  });

  it('flags NOI that does not cover the debt service', () => {
    expect(dscrFor({ grossMonthlyRent: 2_000 }).coversDebtService).toBe(false);
  });

  it('is negative with zero rent and still solves for rent', () => {
    const dscr = dscrFor({ grossMonthlyRent: 0 });
    expect(dscr.value).toBeLessThan(0);
    expect(dscr.rentForMinimum).toBe(3954.4);
  });

  it('cannot solve for rent when reserves take 100% of income', () => {
    const dscr = dscrFor({
      vacancyPct: 40,
      managementPct: 30,
      maintenanceReservePct: 20,
      capexReservePct: 10,
    });
    expect(dscr.rentForMinimum).toBeNull();
    expect(dscr.rentForMinimumNaReason).toBe(
      'Reserves and fees take 100% or more of rent.',
    );
  });

  it('meets the minimum exactly at the solved rent', () => {
    // Unrounded solution: (1.25 × 23,950.92 / 12 + 550) / 0.77.
    const rent = (1.25 * 23950.92) / 12 / 0.77 + 550 / 0.77;
    const scenario = referenceScenario({}, { grossMonthlyRent: rent });
    const dscr = computeDscr({
      scenario,
      // Unrounded NOI so the ratio lands on the minimum.
      annualNoi: (rent * 0.77 - 550) * 12,
      monthlyPrincipalAndInterest: 1995.91,
      minimum: 1.25,
    });
    expect(dscr.value).toBeCloseTo(1.25, 10);
    expect(dscr.meetsMinimum).toBe(true);
  });

  it('subtracts other income from the rent needed', () => {
    expect(dscrFor({ otherMonthlyIncome: 100 }).rentForMinimum).toBe(3854.4);
  });

  it('keeps the ratio but drops the status for an invalid minimum', () => {
    const dscr = dscrFor({}, null);
    expect(dscr.value?.toFixed(4)).toBe('1.1904');
    expect(dscr.minimum).toBeNull();
    expect(dscr.meetsMinimum).toBeNull();
    expect(dscr.rentForMinimum).toBeNull();
    expect(dscr.rentForMinimumNaReason).toBeNull();
  });

  it('is undefined without principal & interest', () => {
    const dscr = dscrFor({}, 1.25, 0);
    expect(dscr.value).toBeNull();
    expect(dscr.naReason).toBe('No principal & interest — DSCR is undefined.');
    expect(dscr.meetsMinimum).toBeNull();
    expect(dscr.coversDebtService).toBeNull();
  });
});

describe('resolveDscrMinimum (spec 006 FR-002)', () => {
  const base = referenceScenario().rental as RentalAssumptions;

  it.each([
    [undefined, 1.25],
    [1.15, 1.15],
    [1, 1],
    [2, 2],
    [0.9, null],
    [2.5, null],
    [Number.NaN, null],
    ['1.2', null],
  ])('%s → %s', (stored, expected) => {
    expect(resolveDscrMinimum({ ...base, dscrMinimum: stored as number })).toBe(
      expected,
    );
  });
});

describe('validateDscrMinimum', () => {
  const base = referenceScenario().rental as RentalAssumptions;

  it('accepts a missing or in-range minimum', () => {
    expect(validateDscrMinimum(base)).toEqual([]);
    expect(validateDscrMinimum({ ...base, dscrMinimum: 1.2 })).toEqual([]);
  });

  it('rejects an out-of-range minimum', () => {
    expect(validateDscrMinimum({ ...base, dscrMinimum: 2.5 })).toEqual([
      {
        field: 'rental.dscrMinimum',
        message: 'Minimum DSCR must be between 1.00 and 2.00.',
      },
    ]);
  });

  it('accepts a null rental', () => {
    expect(validateDscrMinimum(null)).toEqual([]);
  });
});
