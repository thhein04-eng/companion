import { describe, expect, it } from 'vitest';
import { computeSchedule } from 'shared-calculations';
import { referenceScenario } from './__fixtures__/dscr-reference';
import { balanceOwed, breakeven, newPayment } from './refinance-math';

const synthetic = (principal: number, rate: number, term: number) =>
  computeSchedule(
    referenceScenario({
      principal,
      annualInterestRatePct: rate,
      termMonths: term,
    }),
  );

describe('newPayment (spec 014 research R3, R4)', () => {
  it.each<[number, number, number, number]>([
    [240_000, 6.5, 360, 1_516.96],
    [282_394.77, 5.5, 300, 1_734.15],
    [282_394.77, 5.5, 360, 1_603.41],
    [160_000, 7, 360, 1_064.48],
    [120_000, 0, 240, 500],
  ])('%d at %d%% over %d months is $%d', (principal, rate, term, expected) => {
    expect(newPayment(principal, rate, term)).toBe(expected);
  });

  it('equals the schedule engine on a synthetic loan, to the cent (invariant 7)', () => {
    for (const [p, r, t] of [
      [240_000, 6.5, 360],
      [282_394.77, 5.5, 300],
      [150_000, 0, 180],
      [75_500.55, 8.25, 120],
    ] as const) {
      expect(newPayment(p, r, t)).toBe(
        synthetic(p, r, t).summary.monthlyPrincipalAndInterest,
      );
    }
  });
});

describe('breakeven (spec 014 research R8)', () => {
  it('finds the first whole month whose cumulative savings cover the costs', () => {
    expect(breakeven(4_500, 261.76, 300, 60)).toEqual({
      kind: 'month',
      months: 18,
      years: 1,
      remainderMonths: 6,
      loanMonth: 78,
    });
    expect(breakeven(4_500, 392.5, 300, 60)).toMatchObject({
      kind: 'month',
      months: 12,
      years: 1,
      remainderMonths: 0,
      loanMonth: 72,
    });
  });

  it('is exact at the boundary: $4,500 / $250.00 is month 18, not 19', () => {
    expect(breakeven(4_500, 250, 300, 60)).toMatchObject({ months: 18 });
    expect(breakeven(4_500.01, 250, 300, 60)).toMatchObject({ months: 19 });
    expect(breakeven(0.1 + 0.2, 0.1, 300, 1)).toMatchObject({ months: 3 });
  });

  it('is immediate when the costs are $0 and the payment drops', () => {
    expect(breakeven(0, 261.76, 300, 60)).toEqual({ kind: 'immediate' });
  });

  it('has no breakeven when the payment does not drop, even with $0 costs', () => {
    for (const savings of [0, -0.01, -150]) {
      expect(breakeven(4_500, savings, 300, 60)).toEqual({
        kind: 'none',
        reason: 'The new payment is not lower than your current payment',
      });
    }
    expect(breakeven(0, -150, 300, 60)).toMatchObject({ kind: 'none' });
  });

  it('is beyond the term when the savings never cover the costs in time', () => {
    expect(breakeven(80_000, 261.76, 300, 60)).toEqual({ kind: 'beyond-term' });
    // 78,528.00 is the most 300 months can save; 78,528.01 is one cent short.
    expect(breakeven(78_528, 261.76, 300, 60)).toMatchObject({ months: 300 });
    expect(breakeven(78_528.01, 261.76, 300, 60)).toEqual({
      kind: 'beyond-term',
    });
  });

  it('matches a brute-force loop that adds savings month by month', () => {
    for (const [costs, savings] of [
      [4_500, 261.76],
      [1_234.56, 17.89],
      [9_999.99, 333.33],
      [250, 250],
      [250.01, 250],
    ] as const) {
      let total = 0;
      let months = 0;
      while (Math.round(total * 100) < Math.round(costs * 100)) {
        months += 1;
        total += savings;
      }
      expect(breakeven(costs, savings, 1_000, 1)).toMatchObject({ months });
    }
  });
});

describe('balanceOwed (spec 014 research R10)', () => {
  it('is the new loan balance after the horizon when the new term is longer', () => {
    expect(balanceOwed(282_394.77, 5.5, 360, 300)).toBe(83_942.87);
  });

  it('equals the schedule engine balance after the horizon (invariant 8)', () => {
    const schedule = synthetic(282_394.77, 5.5, 360);
    expect(balanceOwed(282_394.77, 5.5, 360, 300)).toBe(
      schedule.periods[299].remainingBalance,
    );
  });

  it('is 0 when the new term equals or is shorter than the horizon', () => {
    expect(balanceOwed(282_394.77, 5.5, 300, 300)).toBe(0);
    expect(balanceOwed(282_394.77, 5.5, 120, 300)).toBe(0);
  });
});
