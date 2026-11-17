import { describe, expect, it } from 'vitest';
import {
  buildBalanceSeries,
  buildPaymentComposition,
  buildScenarioBalanceComparison,
  buildYearlyPrincipalInterest,
  computeBaselineSchedule,
} from './chart-data';
import { computeSchedule, roundCents } from 'shared-calculations';
import {
  baseScenario,
  R1,
  R2,
  R3,
  R4,
} from './__fixtures__/reference-scenarios';

describe('buildBalanceSeries (US1, FR-001)', () => {
  it('R1 without a baseline: one row per period plus the starting balance', () => {
    const schedule = computeSchedule(R1);
    const rows = buildBalanceSeries(schedule, null);

    expect(rows).toHaveLength(361);
    expect(rows[0]).toEqual({
      x: 0,
      date: '2027-01-01',
      balance: 300_000,
      baseline: null,
    });
    for (let n = 1; n <= 360; n++) {
      expect(rows[n].x).toBe(n);
      expect(rows[n].date).toBe(schedule.periods[n - 1].date);
      expect(rows[n].balance).toBe(schedule.periods[n - 1].remainingBalance);
      expect(rows[n].baseline).toBeNull();
    }
    expect(rows[360].balance).toBe(0);
  });

  it('R2 with the R1 baseline: extra-payment line ends at payoff, baseline runs the full term', () => {
    const schedule = computeSchedule(R2);
    const baseline = computeSchedule(R1);
    const rows = buildBalanceSeries(schedule, baseline);
    const payoff = schedule.periods.length;

    expect(payoff).toBeLessThan(360);
    expect(rows).toHaveLength(361);
    expect(rows[0].balance).toBe(300_000);
    expect(rows[payoff].balance).toBe(0);
    for (let n = payoff + 1; n <= 360; n++) expect(rows[n].balance).toBeNull();

    const baselineOnly = buildBalanceSeries(baseline, null);
    for (let n = 0; n <= 360; n++)
      expect(rows[n].baseline).toBe(baselineOnly[n].balance);
  });
});

describe('computeBaselineSchedule', () => {
  it('returns null without extra payments', () => {
    expect(computeBaselineSchedule(R1)).toBeNull();
  });

  it('returns the no-extra schedule when extra payments exist', () => {
    expect(computeBaselineSchedule(R2)).toEqual(
      computeSchedule({ ...R2, extraPayments: [] }),
    );
  });
});

describe('buildYearlyPrincipalInterest (US2, FR-002)', () => {
  it('R1: 30 loan years whose interest sums to the schedule total', () => {
    const schedule = computeSchedule(R1);
    const rows = buildYearlyPrincipalInterest(schedule);

    expect(rows).toHaveLength(30);
    expect(rows.map((r) => r.x)).toEqual(
      Array.from({ length: 30 }, (_, i) => `Yr ${i + 1}`),
    );
    const interest = roundCents(rows.reduce((sum, r) => sum + r.interest, 0));
    expect(interest).toBe(schedule.summary.totalInterestPaid);
    expect(rows[0].interest).toBeGreaterThan(rows[0].principal);
    expect(rows[29].principal).toBeGreaterThan(rows[29].interest);
    for (const row of rows) {
      expect(row.extraPrincipal).toBe(0);
      expect(
        Math.abs(row.principal + row.extraPrincipal + row.interest - row.total),
      ).toBeLessThanOrEqual(0.01);
    }
  });

  it('R1: each loan year equals the sum of its 12 periods to the cent', () => {
    const schedule = computeSchedule(R1);
    const rows = buildYearlyPrincipalInterest(schedule);
    const year1 = schedule.periods.slice(0, 12);
    expect(rows[0].interest).toBe(
      roundCents(year1.reduce((s, p) => s + p.interestPortion, 0)),
    );
    expect(rows[0].principal).toBe(
      roundCents(
        year1.reduce(
          (s, p) => s + p.principalPortion - p.extraPrincipalApplied,
          0,
        ),
      ),
    );
    expect(rows[0].total).toBe(
      roundCents(year1.reduce((s, p) => s + p.paymentAmount, 0)),
    );
  });

  it('R2: extra principal is its own segment and the loan has fewer years', () => {
    const schedule = computeSchedule(R2);
    const rows = buildYearlyPrincipalInterest(schedule);
    const extra = roundCents(
      rows.reduce((sum, r) => sum + r.extraPrincipal, 0),
    );
    expect(extra).toBe(
      roundCents(
        schedule.periods.reduce((s, p) => s + p.extraPrincipalApplied, 0),
      ),
    );
    expect(rows).toHaveLength(Math.ceil(schedule.periods.length / 12));
    expect(rows[0].extraPrincipal).toBe(2_400);
  });

  it('R1 by calendar year: labels are the years', () => {
    const rows = buildYearlyPrincipalInterest(computeSchedule(R1), {
      groupBy: 'calendarYear',
    });
    expect(rows[0].x).toBe('2027');
    expect(rows[rows.length - 1].x).toBe('2056');
    expect(rows[0].year).toBe(2027);
  });

  it('R4 (0%, 12 months): one year, all principal', () => {
    const rows = buildYearlyPrincipalInterest(computeSchedule(R4));
    expect(rows).toHaveLength(1);
    expect(rows[0].interest).toBe(0);
    expect(rows[0].principal).toBe(12_000);
  });
});

describe('buildPaymentComposition (US3, FR-003)', () => {
  it('R1 (no costs): only principal & interest', () => {
    const schedule = computeSchedule(R1);
    const { components, total } = buildPaymentComposition(R1, schedule);
    expect(components.map((c) => c.key)).toEqual(['principalAndInterest']);
    expect(total).toBe(schedule.summary.totalMonthlyPayment);
  });

  it('R3: all five components, in order, summing to the total within a cent', () => {
    const schedule = computeSchedule(R3);
    const { components, total } = buildPaymentComposition(R3, schedule);
    expect(components.map((c) => c.key)).toEqual([
      'principalAndInterest',
      'propertyTax',
      'insurance',
      'pmi',
      'hoa',
    ]);
    const byKey = Object.fromEntries(components.map((c) => [c.key, c.value]));
    expect(byKey.principalAndInterest).toBe(
      schedule.summary.monthlyPrincipalAndInterest,
    );
    expect(byKey.propertyTax).toBe(300);
    expect(byKey.insurance).toBe(100);
    expect(byKey.pmi).toBe(schedule.summary.monthlyPmiAmount);
    expect(byKey.hoa).toBe(50);
    expect(components.map((c) => c.label)).toEqual([
      'Principal & interest',
      'Property tax',
      'Insurance',
      'PMI',
      'HOA',
    ]);
    expect(total).toBe(schedule.summary.totalMonthlyPayment);
    const sum = components.reduce((s, c) => s + c.value, 0);
    expect(Math.abs(sum - total)).toBeLessThanOrEqual(0.01);
  });

  it('omits zero-value components', () => {
    const scenario = { ...R3, monthlyHoa: null };
    const { components } = buildPaymentComposition(
      scenario,
      computeSchedule(scenario),
    );
    expect(components.map((c) => c.key)).not.toContain('hoa');
  });
});

describe('buildScenarioBalanceComparison (US4, FR-004)', () => {
  it('aligns scenarios by elapsed period; a shorter loan is null after payoff', () => {
    const fifteen = baseScenario({
      id: 'r15',
      annualInterestRatePct: 5.75,
      termMonths: 180,
    });
    const s30 = computeSchedule(R1);
    const s15 = computeSchedule(fifteen);
    const rows = buildScenarioBalanceComparison([s30, s15]);

    expect(rows).toHaveLength(361);
    expect(rows.map((r) => r.x)).toEqual(
      Array.from({ length: 361 }, (_, i) => i),
    );
    expect(rows[0].r1).toBe(300_000);
    expect(rows[0].r15).toBe(300_000);
    expect(rows[180].r15).toBe(0);
    for (let n = 181; n <= 360; n++) expect(rows[n].r15).toBeNull();

    const single = buildBalanceSeries(s30, null);
    for (let n = 0; n <= 360; n++) expect(rows[n].r1).toBe(single[n].balance);
  });
});
