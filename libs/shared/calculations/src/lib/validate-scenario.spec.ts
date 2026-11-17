import { describe, expect, it } from 'vitest';
import { validateScenario } from './validate-scenario';
import type { LoanScenario } from './types';

function baseScenario(overrides: Partial<LoanScenario> = {}): LoanScenario {
  return {
    id: 'scenario-1',
    name: 'Baseline',
    principal: 300_000,
    annualInterestRatePct: 6.5,
    termMonths: 360,
    startDate: '2027-01-01',
    paymentFrequency: 'monthly',
    homePrice: null,
    downPayment: null,
    annualPropertyTax: null,
    annualInsurance: null,
    pmiAnnualRatePct: null,
    monthlyHoa: null,
    extraPayments: [],
    principalIsOverridden: false,
    ...overrides,
  };
}

describe('validateScenario', () => {
  it('accepts a valid baseline scenario', () => {
    const result = validateScenario(baseScenario());
    expect(result.valid).toBe(true);
  });

  it('rejects principal <= 0, termMonths <= 0, and negative interest rate together', () => {
    const result = validateScenario(
      baseScenario({ principal: 0, termMonths: -1, annualInterestRatePct: -2 }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      const fields = result.errors.map((e) => e.field);
      expect(fields).toContain('principal');
      expect(fields).toContain('termMonths');
      expect(fields).toContain('annualInterestRatePct');
    }
  });

  it('rejects a down payment amount >= home price (FR-009, Edge Cases)', () => {
    const result = validateScenario(
      baseScenario({ homePrice: 300_000, downPayment: { amount: 300_000 } }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.field === 'downPayment')).toBe(true);
    }
  });

  it('rejects negative extra-payment amounts', () => {
    const result = validateScenario(
      baseScenario({
        extraPayments: [
          { id: 'e1', kind: 'recurring', amount: -50, startPeriod: 1 },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.errors.some((e) => e.field === 'extraPayments.0.amount'),
      ).toBe(true);
    }
  });
});
