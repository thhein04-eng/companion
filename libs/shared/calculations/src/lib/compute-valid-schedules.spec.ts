import { describe, expect, it } from 'vitest';
import { computeSchedule } from './compute-schedule';
import { computeValidSchedules } from './compute-valid-schedules';
import type { LoanScenario } from './types';
import { validateScenario } from './validate-scenario';

function scenario(overrides: Partial<LoanScenario> = {}): LoanScenario {
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
    rental: null,
    ...overrides,
  };
}

describe('computeValidSchedules', () => {
  it('skips invalid scenarios', () => {
    const entries = computeValidSchedules([
      scenario({ id: 'ok' }),
      scenario({ id: 'bad', principal: 0 }),
    ]);
    expect(entries.map((e) => e.scenario.id)).toEqual(['ok']);
  });

  it('preserves input order', () => {
    const entries = computeValidSchedules([
      scenario({ id: 'c' }),
      scenario({ id: 'a', annualInterestRatePct: 5 }),
      scenario({ id: 'b', termMonths: 180 }),
    ]);
    expect(entries.map((e) => e.scenario.id)).toEqual(['c', 'a', 'b']);
  });

  it('pairs each validated scenario with exactly computeSchedule(validated)', () => {
    const input = scenario({ id: 'x', annualInterestRatePct: 7 });
    const [entry] = computeValidSchedules([input]);
    const validated = validateScenario(input);
    if (!validated.valid) throw new Error('fixture must be valid');
    expect(entry.scenario).toEqual(validated.scenario);
    expect(entry.schedule).toEqual(computeSchedule(validated.scenario));
  });

  it('returns an empty list for no input', () => {
    expect(computeValidSchedules([])).toEqual([]);
  });
});
