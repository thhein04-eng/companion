import { describe, expect, it } from 'vitest';
import {
  computeSchedule,
  roundCents,
  type LoanScenario,
  type RefinanceAssumptions,
} from 'shared-calculations';
import { referenceScenario } from './__fixtures__/dscr-reference';
import {
  generatedRefinanceScenarios,
  rateDropReference,
} from './__fixtures__/refinance-reference';
import { REFINANCE_NO_RATE_REASON } from './analyze-cash-out';
import {
  analyzeRateDrop,
  RATE_DROP_PAID_OFF_REASON,
} from './analyze-rate-drop';
import { newPayment } from './refinance-math';
import type { RateDropResult } from './types';

const analyze = (s: LoanScenario) => analyzeRateDrop(s, computeSchedule(s));
function run(scenario: LoanScenario): RateDropResult {
  const a = analyze(scenario);
  if (!a.result) throw new Error(a.naReason ?? 'no result');
  return a.result;
}
const drop = (refinance: RefinanceAssumptions = {}) =>
  rateDropReference(refinance);

describe('analyzeRateDrop — the reference loan (spec 014 US3, contracts § Rate drop)', () => {
  it('refinancing at month 60 into the remaining 300 months', () => {
    expect(run(drop())).toEqual({
      balanceRefinanced: 282_394.77,
      currentPi: 1_995.91,
      newPi: 1_734.15,
      monthlySavings: 261.76,
      breakeven: {
        kind: 'month',
        months: 18,
        years: 1,
        remainderMonths: 6,
        loanMonth: 78,
      },
      netSavings: 74_028,
      horizonMonths: 300,
      newTermMonths: 300,
      termExtended: false,
    });
  });

  it('a fresh 30-year term lowers the payment more but leaves a balance, so the net saving is smaller', () => {
    const r = run(drop({ newTermMonths: 360 }));
    expect(r.newPi).toBe(1_603.41);
    expect(r.monthlySavings).toBe(392.5);
    expect(r.breakeven).toEqual({
      kind: 'month',
      months: 12,
      years: 1,
      remainderMonths: 0,
      loanMonth: 72,
    });
    expect(r.netSavings).toBe(29_307.13);
    expect(r.termExtended).toBe(true);
    expect(r.horizonMonths).toBe(300);
  });

  it('$0 closing costs are immediate', () => {
    const r = run(drop({ closingCostsDollars: 0 }));
    expect(r.breakeven).toEqual({ kind: 'immediate' });
    expect(r.netSavings).toBe(78_528);
  });

  it('$80,000 of closing costs never pay back within the term', () => {
    const r = run(drop({ closingCostsDollars: 80_000 }));
    expect(r.breakeven).toEqual({ kind: 'beyond-term' });
    expect(r.netSavings).toBe(-1_472);
  });

  it('a new rate above the current rate has negative savings and no breakeven', () => {
    const r = run(drop({ newRatePct: 7.5 }));
    expect(r.monthlySavings).toBeLessThan(0);
    expect(r.breakeven).toEqual({
      kind: 'none',
      reason: 'The new payment is not lower than your current payment',
    });
    expect(r.netSavings).toBeLessThan(0);
  });

  it('is not immediate when the costs are $0 but the payment goes up', () => {
    const r = run(drop({ newRatePct: 7.5, closingCostsDollars: 0 }));
    expect(r.breakeven).toMatchObject({ kind: 'none' });
  });

  it('a shorter new term counts only the payments the new loan makes', () => {
    const r = run(drop({ newTermMonths: 120, newRatePct: 4 }));
    expect(r.termExtended).toBe(false);
    expect(r.netSavings).toBe(
      roundCents(1_995.91 * 300 - r.newPi * 120 - 4_500),
    );
  });

  it('works without a rental', () => {
    const noRental = rateDropReference({}, { rental: null });
    expect(run(noRental)).toEqual(run(drop()));
  });

  it('ignores an invalid ARV and LTV, which Rate-drop mode does not use', () => {
    const a = analyze(drop({ arvDollars: 0, ltvPct: 120 }));
    expect(a.result).not.toBeNull();
    expect(a.errors).toEqual([]);
  });
});

describe('analyzeRateDrop — missing and invalid inputs', () => {
  it('prompts for a missing new rate', () => {
    const a = analyze(drop({ newRatePct: undefined }));
    expect(a.result).toBeNull();
    expect(a.naReason).toBe(REFINANCE_NO_RATE_REASON);
  });

  it('reports the loan as paid off at the final month', () => {
    const a = analyze(drop({ refinanceMonth: 360 }));
    expect(a.result).toBeNull();
    expect(a.naReason).toBe(RATE_DROP_PAID_OFF_REASON);
    expect(RATE_DROP_PAID_OFF_REASON).toBe(
      'The loan is already paid off at this month.',
    );
    // A month above the term clamps to the final month, with the same answer.
    expect(analyze(drop({ refinanceMonth: 999 })).naReason).toBe(
      RATE_DROP_PAID_OFF_REASON,
    );
  });

  it('reports the loan as paid off when extra payments cleared it earlier', () => {
    const s = referenceScenario({
      extraPayments: [
        { id: 'x', kind: 'recurring', amount: 5_000, startPeriod: 1 },
      ],
      refinance: { mode: 'rate-drop', newRatePct: 5.5, refinanceMonth: 100 },
    });
    expect(computeSchedule(s).periods.length).toBeLessThan(100);
    expect(analyze(s).naReason).toBe(RATE_DROP_PAID_OFF_REASON);
  });

  it('flags an invalid new term', () => {
    const a = analyze(drop({ newTermMonths: 600 }));
    expect(a.result).toBeNull();
    expect(a.errors.map((e) => e.field)).toEqual(['refinance.newTermMonths']);
  });

  it('honours extra payments in the balance refinanced', () => {
    const s = referenceScenario({
      extraPayments: [
        { id: 'x', kind: 'recurring', amount: 300, startPeriod: 1 },
      ],
      refinance: {
        mode: 'rate-drop',
        newRatePct: 5.5,
        closingCostsDollars: 4_500,
        refinanceMonth: 60,
      },
    });
    expect(run(s).balanceRefinanced).toBe(
      computeSchedule(s).periods[59].remainingBalance,
    );
    expect(run(s).balanceRefinanced).toBeLessThan(282_394.77);
  });
});

describe('analyzeRateDrop — invariants 6–9 over generated scenarios', () => {
  const scenarios = generatedRefinanceScenarios(25);
  const synthetic = (principal: number, rate: number, term: number) =>
    computeSchedule(
      referenceScenario({
        principal,
        annualInterestRatePct: rate,
        termMonths: term,
      }),
    );
  /** How long a result takes to pay back: Infinity when it never does. */
  const rank = (r: RateDropResult) =>
    r.breakeven.kind === 'immediate'
      ? 0
      : r.breakeven.kind === 'month'
        ? r.breakeven.months
        : Number.POSITIVE_INFINITY;

  it('analyses every generated scenario', () => {
    for (const s of scenarios) expect(analyze(s).result).not.toBeNull();
  });

  it('invariant 6: the breakeven month equals a brute-force month-by-month loop', () => {
    for (const s of scenarios) {
      const r = run(s);
      const costsCents = Math.round(
        (s.refinance?.closingCostsDollars ?? 0) * 100,
      );
      const savingsCents = Math.round(r.monthlySavings * 100);
      let months = 0;
      let total = 0;
      while (
        total < costsCents &&
        months < r.horizonMonths &&
        savingsCents > 0
      ) {
        months += 1;
        total += savingsCents;
      }
      const b = r.breakeven;
      if (savingsCents <= 0) expect(b.kind).toBe('none');
      else if (costsCents === 0) expect(b.kind).toBe('immediate');
      else if (total < costsCents) expect(b.kind).toBe('beyond-term');
      else {
        expect(b).toMatchObject({ kind: 'month', months });
        expect(months * savingsCents).toBeGreaterThanOrEqual(costsCents);
        expect((months - 1) * savingsCents).toBeLessThan(costsCents);
      }
    }
  });

  it('invariant 7: the new payment equals the schedule engine on a synthetic loan', () => {
    for (const s of scenarios) {
      const r = run(s);
      const rate = s.refinance?.newRatePct ?? 0;
      expect(r.newPi).toBe(
        synthetic(r.balanceRefinanced, rate, r.newTermMonths).summary
          .monthlyPrincipalAndInterest,
      );
      expect(r.newPi).toBe(
        newPayment(r.balanceRefinanced, rate, r.newTermMonths),
      );
    }
  });

  it('invariant 8: the net saving counts the balance the schedule engine says is still owed', () => {
    for (const s of scenarios) {
      const r = run(s);
      const rate = s.refinance?.newRatePct ?? 0;
      const costs = s.refinance?.closingCostsDollars ?? 0;
      const H = r.horizonMonths;
      const owed =
        r.newTermMonths > H
          ? synthetic(r.balanceRefinanced, rate, r.newTermMonths).periods[H - 1]
              .remainingBalance
          : 0;
      expect(r.netSavings).toBe(
        roundCents(
          r.currentPi * H -
            r.newPi * Math.min(H, r.newTermMonths) -
            costs -
            owed,
        ),
      );
    }
  });

  it('invariant 9: a higher new rate never lowers the payment or moves the breakeven earlier', () => {
    for (const s of scenarios) {
      const higher = {
        ...s,
        refinance: {
          ...s.refinance,
          newRatePct: (s.refinance?.newRatePct ?? 0) + 1,
        },
      };
      const a = run(s);
      const b = run(higher);
      expect(b.newPi).toBeGreaterThanOrEqual(a.newPi);
      expect(rank(b)).toBeGreaterThanOrEqual(rank(a));
    }
  });
});
