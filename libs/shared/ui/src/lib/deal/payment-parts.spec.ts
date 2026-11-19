import { describe, expect, it } from 'vitest';
import { computeSchedule, type LoanScenario } from 'shared-calculations';
import { dealPayment } from './payment-parts';

const reference: LoanScenario = {
  id: 's',
  name: 'S',
  principal: 360_000,
  annualInterestRatePct: 6.5,
  termMonths: 360,
  startDate: '2027-01-01',
  paymentFrequency: 'monthly',
  homePrice: 450_000,
  downPayment: { percent: 20 },
  annualPropertyTax: 5_400,
  annualInsurance: 1_800,
  pmiAnnualRatePct: 0.5,
  monthlyHoa: 120,
  extraPayments: [],
  rental: null,
  principalIsOverridden: false,
};

const sum = (s: LoanScenario) => {
  const p = dealPayment(s, computeSchedule(s));
  if (!p) throw new Error('no payment');
  return { p, parts: p.parts.reduce((a, x) => a + x.monthly, 0) };
};

describe('dealPayment / paymentParts (spec 010 T037)', () => {
  it('sums to the total monthly payment for the quickstart reference deal', () => {
    const { p, parts } = sum(reference);
    expect(Math.abs(parts - p.total)).toBeLessThanOrEqual(0.01);
    expect(p.parts.find((x) => x.field === 'pmiAnnualRatePct')?.monthly).toBe(
      0,
    );
    expect(p.parts.find((x) => x.field === 'annualPropertyTax')?.monthly).toBe(
      450,
    );
  });

  it('sums to the total for a deal with PMI', () => {
    const { p, parts } = sum({
      ...reference,
      downPayment: { percent: 10 },
      principal: 405_000,
    });
    expect(
      p.parts.find((x) => x.field === 'pmiAnnualRatePct')?.monthly,
    ).toBeGreaterThan(0);
    expect(Math.abs(parts - p.total)).toBeLessThanOrEqual(0.01);
  });

  it('is null without a schedule', () => {
    expect(dealPayment(reference, null)).toBeNull();
  });
});
