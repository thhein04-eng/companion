import { describe, expect, it } from 'vitest';
import { stepValue } from './step-value';

describe('stepValue (spec 010 data-model §A)', () => {
  it.each<[Parameters<typeof stepValue>[0], number, number, number]>([
    ['annualInterestRatePct', 6.5, 4, 7],
    ['annualInterestRatePct', 6.5, 10, 7.75],
    ['termMonths', 360, 1, 372],
    ['homePrice', 450_000, -1, 449_000],
    ['rental.grossMonthlyRent', 3_200, 1, 3_225],
    ['pmiAnnualRatePct', 0.5, 1, 0.55],
    ['monthlyHoa', 120, 1, 130],
    ['annualPropertyTax', 5_400, 1, 5_500],
    ['annualInsurance', 1_800, -1, 1_700],
    ['principal', 360_000, 1, 361_000],
  ])('%s %d %+d steps → %d', (key, value, steps, expected) => {
    expect(stepValue(key, value, steps)).toBe(expected);
  });

  it('steps a percent down payment by 1 point and an amount by $1,000', () => {
    expect(stepValue('downPayment', { percent: 20 }, 1)).toEqual({
      percent: 21,
    });
    expect(stepValue('downPayment', { amount: 90_000 }, 1)).toEqual({
      amount: 91_000,
    });
  });

  it('clamps: currency ≥ 0, rate 0–100, term 1–480 months, down % 0–99, PMI ≥ 0', () => {
    expect(stepValue('annualInterestRatePct', 0.1, -1)).toBe(0);
    expect(stepValue('annualInterestRatePct', 99.9, 1)).toBe(100);
    expect(stepValue('termMonths', 12, -1)).toBe(1);
    expect(stepValue('termMonths', 480, 1)).toBe(480);
    expect(stepValue('homePrice', 500, -1)).toBe(0);
    expect(stepValue('pmiAnnualRatePct', 0.02, -1)).toBe(0);
    expect(stepValue('downPayment', { percent: 99.5 }, 1)).toEqual({
      percent: 99,
    });
    expect(stepValue('downPayment', { percent: 98 }, 10)).toEqual({
      percent: 99,
    });
  });

  it('returns null for a null value, and leaves fields without a step unchanged', () => {
    expect(stepValue('homePrice', null, 1)).toBeNull();
    expect(stepValue('startDate', '2027-01-01', 1)).toBe('2027-01-01');
  });
});
