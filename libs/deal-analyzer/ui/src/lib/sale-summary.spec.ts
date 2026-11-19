import { describe, expect, it } from 'vitest';
import { saleHeading, signedMoney } from './sale-summary';

describe('signedMoney', () => {
  it('uses a true minus sign for negatives', () => {
    expect(signedMoney(-35623.82)).toBe('−$35,623.82');
    expect(signedMoney(151420.55)).toBe('$151,420.55');
  });

  it('shows a negated zero as $0.00, never "-$0.00"', () => {
    expect(signedMoney(-0)).toBe('$0.00');
    expect(signedMoney(0)).toBe('$0.00');
  });
});

describe('saleHeading', () => {
  it('follows the unit', () => {
    expect(saleHeading(84, 'years')).toBe('Sale after 7 years');
    expect(saleHeading(12, 'years')).toBe('Sale after 1 year');
    expect(saleHeading(90, 'years')).toBe('Sale after 7 yr 6 mo');
    expect(saleHeading(6, 'years')).toBe('Sale after 6 mo');
    expect(saleHeading(90, 'months')).toBe('Sale after 90 months');
    expect(saleHeading(1, 'months')).toBe('Sale after 1 month');
  });
});
