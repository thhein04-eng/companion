import { DEFAULT_RENTAL_ASSUMPTIONS } from 'shared-calculations';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SENSITIVITY,
  resolveTarget,
  validateSensitivityTarget,
} from './validate-sensitivity';

const rental = (
  sensitivity?: Parameters<typeof resolveTarget>[0]['sensitivity'],
) => ({
  ...DEFAULT_RENTAL_ASSUMPTIONS,
  grossMonthlyRent: 2_400,
  sensitivity,
});

describe('resolveTarget (spec 015 data-model §A)', () => {
  it('has the defaults 8% and $300/mo, and is not set without a saved target', () => {
    expect(DEFAULT_SENSITIVITY).toEqual({
      cashOnCashPct: 8,
      cashFlowMonthly: 300,
    });
    expect(resolveTarget(rental())).toEqual({
      measure: 'cashOnCash',
      value: 8,
      isSet: false,
    });
    expect(resolveTarget(rental(null))).toEqual({
      measure: 'cashOnCash',
      value: 8,
      isSet: false,
    });
  });

  it('starts on the fallback measure (the grid’s) until one is saved', () => {
    expect(resolveTarget(rental(), 'cashFlow')).toEqual({
      measure: 'cashFlow',
      value: 300,
      isSet: false,
    });
  });

  it('reads the saved measure and that measure’s own value, and is set', () => {
    const r = rental({
      targetMeasure: 'cashFlow',
      cashOnCashPct: 9.5,
      cashFlowMonthly: 425,
    });
    expect(resolveTarget(r, 'cashOnCash')).toEqual({
      measure: 'cashFlow',
      value: 425,
      isSet: true,
    });
    expect(
      resolveTarget(
        rental({ targetMeasure: 'cashOnCash', cashFlowMonthly: 425 }),
      ),
    ).toEqual({
      measure: 'cashOnCash',
      value: 8,
      isSet: true,
    });
  });

  it('uses the default value of the saved measure when only the other one was saved', () => {
    expect(resolveTarget(rental({ cashOnCashPct: 6 }), 'cashFlow')).toEqual({
      measure: 'cashFlow',
      value: 300,
      isSet: true,
    });
  });
});

describe('validateSensitivityTarget (spec 015 data-model §F)', () => {
  const cashOnCash = (value: number) =>
    validateSensitivityTarget({ measure: 'cashOnCash', value });
  const cashFlow = (value: number) =>
    validateSensitivityTarget({ measure: 'cashFlow', value });

  it('accepts Cash-on-Cash 0 to 1000%, including the bounds', () => {
    for (const v of [0, 8, 1_000]) expect(cashOnCash(v)).toEqual([]);
  });

  it('rejects a negative, too large or non-finite Cash-on-Cash target', () => {
    for (const v of [-0.01, 1_000.01, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(cashOnCash(v)).toEqual([
        { field: 'rental.sensitivity.cashOnCashPct', message: 'Use 0–1000%' },
      ]);
    }
  });

  it('accepts a cash-flow target of 0, a negative one and ±$1,000,000', () => {
    for (const v of [0, -250, 300, 1_000_000, -1_000_000])
      expect(cashFlow(v)).toEqual([]);
  });

  it('rejects a non-finite or out-of-range cash-flow target', () => {
    for (const v of [1_000_000.01, -1_000_000.01, Number.NaN]) {
      expect(cashFlow(v)).toEqual([
        {
          field: 'rental.sensitivity.cashFlowMonthly',
          message: 'Enter a dollar amount',
        },
      ]);
    }
  });
});
