import { describe, expect, it } from 'vitest';
import { stepValue } from './step-value';

describe('stepValue (spec 010 data-model §A)', () => {
  it.each<[Parameters<typeof stepValue>[0], number, number, number]>([
    ['annualInterestRatePct', 6.5, 4, 6.54],
    ['annualInterestRatePct', 6.5, 10, 6.6],
    ['termMonths', 360, 1, 372],
    ['homePrice', 450_000, -1, 449_900],
    ['rental.grossMonthlyRent', 3_200, 1, 3_201],
    ['pmiAnnualRatePct', 0.5, 1, 0.51],
    ['monthlyHoa', 120, 1, 121],
    ['annualPropertyTax', 5_400, 1, 5_410],
    ['annualInsurance', 1_800, -1, 1_790],
    ['principal', 360_000, 1, 360_100],
  ])('%s %d %+d steps → %d', (key, value, steps, expected) => {
    expect(stepValue(key, value, steps)).toBe(expected);
  });

  it('steps a percent down payment by 0.1 point and an amount by $100', () => {
    expect(stepValue('downPayment', { percent: 20 }, 1)).toEqual({
      percent: 20.1,
    });
    expect(stepValue('downPayment', { amount: 90_000 }, 1)).toEqual({
      amount: 90_100,
    });
  });

  it('steps exactly from an off-step value instead of rounding it', () => {
    expect(stepValue('annualInterestRatePct', 6.4375, 1)).toBe(6.4475);
    expect(stepValue('downPayment', { percent: 20.55 }, 1)).toEqual({
      percent: 20.65,
    });
    expect(stepValue('downPayment', { amount: 90_050.5 }, -1)).toEqual({
      amount: 89_950.5,
    });
    expect(stepValue('homePrice', 347_550, 1)).toBe(347_650);
  });

  it('clamps: currency ≥ 0, rate 0–100, term 1–480 months, down % 0–99, PMI ≥ 0', () => {
    expect(stepValue('annualInterestRatePct', 0.005, -1)).toBe(0);
    expect(stepValue('annualInterestRatePct', 99.995, 1)).toBe(100);
    expect(stepValue('termMonths', 12, -1)).toBe(1);
    expect(stepValue('termMonths', 480, 1)).toBe(480);
    expect(stepValue('homePrice', 50, -1)).toBe(0);
    expect(stepValue('pmiAnnualRatePct', 0.005, -1)).toBe(0);
    expect(stepValue('downPayment', { percent: 98.95 }, 1)).toEqual({
      percent: 99,
    });
    expect(stepValue('downPayment', { percent: 98 }, 100)).toEqual({
      percent: 99,
    });
  });

  it('returns null for a null value, and leaves fields without a step unchanged', () => {
    expect(stepValue('homePrice', null, 1)).toBeNull();
    expect(stepValue('startDate', '2027-01-01', 1)).toBe('2027-01-01');
  });
});
