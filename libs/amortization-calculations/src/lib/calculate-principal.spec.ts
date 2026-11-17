import { describe, expect, it } from 'vitest';
import { calculatePrincipalFromHomePriceAndDownPayment } from './calculate-principal';

describe('calculatePrincipalFromHomePriceAndDownPayment', () => {
  it('subtracts an amount-based down payment from the home price', () => {
    expect(calculatePrincipalFromHomePriceAndDownPayment(350_000, { amount: 35_000 })).toBe(315_000);
  });

  it('subtracts a percent-based down payment from the home price', () => {
    expect(calculatePrincipalFromHomePriceAndDownPayment(350_000, { percent: 10 })).toBe(315_000);
  });
});
