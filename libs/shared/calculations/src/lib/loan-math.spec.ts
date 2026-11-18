import { describe, expect, it } from 'vitest';
import { monthlyPayment, remainingBalance } from './loan-math';
import { roundCents } from './round';

describe('monthlyPayment', () => {
  it.each([
    [300000, 6.5, 360, 1896.2],
    [300000, 7, 360, 1995.91],
    [300000, 8, 360, 2201.29],
    [300000, 0, 360, 833.33],
  ])('%d at %d%% over %d months → %d', (p, r, n, expected) => {
    expect(roundCents(monthlyPayment(p, r, n))).toBe(expected);
  });
});

describe('remainingBalance', () => {
  it('matches the closed form after 84 payments', () => {
    expect(roundCents(remainingBalance(300000, 6.5, 360, 84))).toBe(271248.73);
  });

  it('is the principal before any payment', () => {
    expect(remainingBalance(300000, 6.5, 360, 0)).toBe(300000);
  });

  it('is zero at the end of the term', () => {
    expect(Math.abs(remainingBalance(300000, 6.5, 360, 360))).toBeLessThan(
      1e-6,
    );
  });

  it('is linear at 0%', () => {
    expect(remainingBalance(360000, 0, 360, 12)).toBe(348000);
  });

  it('re-amortizes into the ARM reset payment', () => {
    const balance = remainingBalance(300000, 6.5, 360, 84);
    expect(roundCents(monthlyPayment(balance, 8.5, 276))).toBe(2240.75);
  });
});
