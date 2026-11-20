import { describe, expect, it } from 'vitest';
import {
  computeSchedule,
  roundCents,
  type LoanScenario,
  type RefinanceAssumptions,
} from 'shared-calculations';
import {
  brrrrReference,
  generatedRefinanceScenarios,
  nonRentalReference,
} from './__fixtures__/refinance-reference';
import {
  analyzeCashOut,
  ALL_CASH_RECOVERED_REASON,
  CASH_OUT_NO_ARV_REASON,
  NO_RENTAL_COC_REASON,
  REFINANCE_INVALID_REASON,
  REFINANCE_NO_RATE_REASON,
} from './analyze-cash-out';
import { analyzeDeal } from './analyze-deal';
import type { CashOutResult } from './types';

function run(scenario: LoanScenario): CashOutResult {
  const a = analyzeCashOut(scenario, computeSchedule(scenario));
  if (!a.result) throw new Error(a.naReason ?? 'no result');
  return a.result;
}
const brrrr = (
  refinance: RefinanceAssumptions = {},
  o: Partial<LoanScenario> = {},
) => brrrrReference(o, refinance);

describe('analyzeCashOut — the proceeds (spec 014 US1, contracts § BRRRR deal)', () => {
  it('reproduces the BRRRR reference deal to the cent', () => {
    expect(run(brrrr())).toMatchObject({
      newLoan: 240_000,
      payoff: 158_374.7,
      closingCosts: 5_000,
      netProceeds: 76_625.3,
      isCashIn: false,
      currentPi: 1_064.48,
      newPi: 1_516.96,
      piChange: 452.48,
    });
  });

  it('a higher ARV recovers more (ARV $250,000)', () => {
    const r = run(brrrr({ arvDollars: 250_000 }));
    expect(r.newLoan).toBe(187_500);
    expect(r.netProceeds).toBe(24_125.3);
    expect(r.isCashIn).toBe(false);
  });

  it('a new loan smaller than payoff plus costs is a cash-in refinance (ARV $200,000)', () => {
    const r = run(brrrr({ arvDollars: 200_000 }));
    expect(r.newLoan).toBe(150_000);
    expect(r.netProceeds).toBe(-13_374.7);
    expect(r.isCashIn).toBe(true);
  });

  it('a lower new rate lowers the new payment, and the change is signed', () => {
    const r = run(brrrr({ newRatePct: 5 }));
    expect(r.newPi).toBeLessThan(r.currentPi + 452.48);
    expect(r.piChange).toBe(roundCents(r.newPi - r.currentPi));
  });
});

describe('analyzeCashOut — missing and invalid inputs', () => {
  const analyze = (s: LoanScenario) => analyzeCashOut(s, computeSchedule(s));

  it('prompts for a missing ARV', () => {
    const s = brrrr({ arvDollars: undefined });
    expect(analyze(s)).toEqual({
      result: null,
      naReason: CASH_OUT_NO_ARV_REASON,
      errors: [],
    });
    expect(CASH_OUT_NO_ARV_REASON).toBe(
      'Enter an after-repair value to model a refinance.',
    );
  });

  it('prompts for a missing new rate', () => {
    const a = analyze(brrrr({ newRatePct: undefined }));
    expect(a.result).toBeNull();
    expect(a.naReason).toBe(REFINANCE_NO_RATE_REASON);
    expect(REFINANCE_NO_RATE_REASON).toBe(
      'Enter a new interest rate to model a refinance.',
    );
  });

  it('asks for the ARV first when both the ARV and the rate are missing', () => {
    const a = analyze(brrrr({ arvDollars: undefined, newRatePct: undefined }));
    expect(a.naReason).toBe(CASH_OUT_NO_ARV_REASON);
  });

  it('returns the field errors and the invalid reason for an invalid LTV (96)', () => {
    const a = analyze(brrrr({ ltvPct: 96 }));
    expect(a.result).toBeNull();
    expect(a.naReason).toBe(REFINANCE_INVALID_REASON);
    expect(REFINANCE_INVALID_REASON).toBe(
      'Fix the refinance inputs to see the result.',
    );
    expect(a.errors.map((e) => e.field)).toEqual(['refinance.ltvPct']);
  });

  it('treats an ARV of $0 as invalid, not as missing', () => {
    const a = analyze(brrrr({ arvDollars: 0 }));
    expect(a.naReason).toBe(REFINANCE_INVALID_REASON);
    expect(a.errors.map((e) => e.field)).toEqual(['refinance.arvDollars']);
  });

  it('has no result and no prompt-vs-error confusion when refinance is absent', () => {
    const a = analyze(brrrrReference({ refinance: null }));
    expect(a.naReason).toBe(CASH_OUT_NO_ARV_REASON);
  });
});

/** The rental of a scenario that is known to have one. */
function rentalOf(scenario: LoanScenario): NonNullable<LoanScenario['rental']> {
  if (!scenario.rental) throw new Error('scenario has no rental');
  return scenario.rental;
}

describe('analyzeCashOut — boundaries', () => {
  it.each([1, 95])('accepts LTV %d%%', (ltvPct) => {
    const r = run(brrrr({ ltvPct }));
    expect(r.newLoan).toBe(roundCents((320_000 * ltvPct) / 100));
  });

  it('pays off the balance after the first payment at refinance month 1', () => {
    const s = brrrr({ refinanceMonth: 1 });
    expect(run(s).payoff).toBe(computeSchedule(s).periods[0].remainingBalance);
  });

  it('has a $0 payoff at the loan term', () => {
    expect(run(brrrr({ refinanceMonth: 360 })).payoff).toBe(0);
  });

  it('clamps a month above the term to the term', () => {
    expect(run(brrrr({ refinanceMonth: 999 })).payoff).toBe(0);
  });

  it('handles a 0% new rate', () => {
    const r = run(brrrr({ newRatePct: 0 }));
    expect(r.newPi).toBe(roundCents(240_000 / 360));
  });

  it('handles a 0% current rate', () => {
    const s = brrrr({}, { annualInterestRatePct: 0 });
    const schedule = computeSchedule(s);
    expect(run(s).currentPi).toBe(schedule.summary.monthlyPrincipalAndInterest);
    expect(run(s).payoff).toBe(schedule.periods[11].remainingBalance);
  });

  it('honours the new term', () => {
    expect(run(brrrr({ newTermMonths: 180 })).newPi).toBeGreaterThan(1_516.96);
  });
});

describe('analyzeCashOut — payoff honours extra payments (invariant 10)', () => {
  it('pays off the extra-payment balance, which is lower than without extras', () => {
    const extras: LoanScenario['extraPayments'] = [
      { id: 'x', kind: 'recurring', amount: 300, startPeriod: 1 },
    ];
    const withExtras = brrrr({}, { extraPayments: extras });
    const schedule = computeSchedule(withExtras);
    const r = run(withExtras);
    expect(r.payoff).toBe(schedule.periods[11].remainingBalance);
    expect(r.payoff).toBeLessThan(158_374.7);
  });

  it('pays off $0 past the last period of an extra-payment schedule', () => {
    const extras: LoanScenario['extraPayments'] = [
      { id: 'x', kind: 'recurring', amount: 5_000, startPeriod: 1 },
    ];
    const s = brrrr({ refinanceMonth: 100 }, { extraPayments: extras });
    expect(computeSchedule(s).periods.length).toBeLessThan(100);
    expect(run(s).payoff).toBe(0);
  });
});

describe('analyzeCashOut — invariant 1 over generated scenarios', () => {
  it('net proceeds = new loan − payoff − closing costs, and payoff is the schedule balance', () => {
    for (const s of generatedRefinanceScenarios(25)) {
      const schedule = computeSchedule(s);
      const r = run(s);
      const month = Math.min(s.refinance?.refinanceMonth ?? 12, s.termMonths);
      const payoff =
        month > schedule.periods.length
          ? 0
          : schedule.periods[month - 1].remainingBalance;
      expect(r.payoff).toBe(payoff);
      expect(r.netProceeds).toBe(
        roundCents(r.newLoan - r.payoff - r.closingCosts),
      );
      expect(r.isCashIn).toBe(r.netProceeds < 0);
    }
  });
});

describe('analyzeCashOut — capital recycled (spec 014 US2, contracts § BRRRR deal)', () => {
  it('reproduces the BRRRR scorecard to the cent', () => {
    const r = run(brrrr());
    expect(r.totalCashInvested).toBe(96_000);
    expect(r.cashLeft).toBe(19_374.7);
    expect(r.capitalRecycledPct.value).toBeCloseTo(0.79818, 5);
    expect(r.allCashRecovered).toBe(false);
    expect(r.cashSurplus).toBe(0);
    expect(r.noiAnnual).toBe(22_272);
    expect(r.cashFlowBefore).toBe(9_498.24);
    expect(r.cashOnCashBefore.value).toBeCloseTo(0.09894, 5);
    expect(r.cashFlowAfter).toBe(4_068.48);
    expect(r.cashOnCashAfter.value).toBeCloseTo(0.20999, 5);
    expect(r.cashOnCashAfter.naReason).toBeNull();
  });

  it('recovers all the cash at ARV $400,000, with a surplus and no cash-on-cash after', () => {
    const r = run(brrrr({ arvDollars: 400_000 }));
    expect(r.newLoan).toBe(300_000);
    expect(r.netProceeds).toBe(136_625.3);
    expect(r.cashLeft).toBe(-40_625.3);
    expect(r.allCashRecovered).toBe(true);
    expect(r.cashSurplus).toBe(40_625.3);
    expect(r.cashOnCashAfter).toEqual({
      value: null,
      naReason: ALL_CASH_RECOVERED_REASON,
    });
    expect(ALL_CASH_RECOVERED_REASON).toBe('All cash recovered');
  });

  it('treats exactly $0 left as all cash recovered with a $0 surplus (never -0)', () => {
    // ARV chosen so net proceeds equal the $96,000 invested: newLoan = 96,000 + 158,374.70 + 5,000.
    const arv = (96_000 + 158_374.7 + 5_000) / 0.75;
    const r = run(brrrr({ arvDollars: arv }));
    expect(r.cashLeft).toBe(0);
    expect(r.allCashRecovered).toBe(true);
    expect(Object.is(r.cashSurplus, 0)).toBe(true);
  });

  it('ARV $250,000 leaves $71,874.70, recycling 25.13%', () => {
    const r = run(brrrr({ arvDollars: 250_000 }));
    expect(r.cashLeft).toBe(71_874.7);
    expect(r.capitalRecycledPct.value).toBeCloseTo(0.25131, 5);
  });

  it('ARV $200,000 (cash-in) leaves more than was invested, recycling −13.93%', () => {
    const r = run(brrrr({ arvDollars: 200_000 }));
    expect(r.cashLeft).toBe(109_374.7);
    expect(r.capitalRecycledPct.value).toBeCloseTo(-0.13932, 5);
    expect(r.allCashRecovered).toBe(false);
  });

  it('a non-rental scenario invests the down payment alone and has no cash-on-cash', () => {
    const r = run(nonRentalReference());
    expect(r.totalCashInvested).toBe(40_000);
    expect(r.cashLeft).toBe(roundCents(40_000 - 76_625.3));
    expect(r.cashFlowBefore).toBeNull();
    expect(r.cashFlowAfter).toBeNull();
    expect(r.noiAnnual).toBeNull();
    expect(r.cashOnCashBefore).toEqual({
      value: null,
      naReason: NO_RENTAL_COC_REASON,
    });
    expect(r.cashOnCashAfter).toEqual({
      value: null,
      naReason: NO_RENTAL_COC_REASON,
    });
    expect(NO_RENTAL_COC_REASON).toBe('Add rent to see cash-on-cash');
  });

  it('has an undefined capital-recycled ratio when nothing was invested', () => {
    const s = brrrr({}, { downPayment: { amount: 0 }, principal: 200_000 });
    const r = run({
      ...s,
      rental: { ...rentalOf(s), closingCosts: 0, rehabBudget: 0 },
    });
    expect(r.totalCashInvested).toBe(0);
    expect(r.capitalRecycledPct.value).toBeNull();
    expect(r.capitalRecycledPct.naReason).toMatch(/No cash invested/);
  });

  it('a negative post-refinance cash flow gives a negative cash-on-cash after', () => {
    // A 9% new rate on the $240,000 loan costs far more than the $22,272 NOI covers.
    const r = run(brrrr({ newRatePct: 9 }));
    expect(r.cashFlowAfter).toBeLessThan(0);
    expect(r.cashOnCashAfter.value).toBeLessThan(0);
  });

  it('a house-hacked rental follows the rental analysis for NOI and cash-on-cash before', () => {
    const base = brrrrReference();
    const s: LoanScenario = {
      ...base,
      rental: {
        ...rentalOf(base),
        grossMonthlyRent: 2_750,
        units: [
          {
            id: 'a',
            name: 'Unit A',
            bedrooms: 2,
            bathrooms: 1,
            rent: 1_350,
            vacancyPct: null,
            ownerOccupied: true,
            rentAfterMoveOut: 1_350,
          },
          {
            id: 'b',
            name: 'Unit B',
            bedrooms: 2,
            bathrooms: 1,
            rent: 1_400,
            vacancyPct: null,
            ownerOccupied: false,
            rentAfterMoveOut: null,
          },
        ],
      },
    };
    const deal = analyzeDeal(s, computeSchedule(s));
    const r = run(s);
    expect(r.noiAnnual).toBe(deal.netOperatingIncome.annual);
    expect(r.cashFlowBefore).toBe(deal.cashFlow.annual);
    expect(r.cashOnCashBefore).toEqual(deal.cashOnCashReturn);
    expect(r.cashFlowAfter).toBe(
      roundCents(deal.netOperatingIncome.annual - 12 * r.newPi),
    );
  });
});

describe('analyzeCashOut — invariants 2–5 over generated scenarios and the reference deals', () => {
  const scenarios = [brrrrReference(), ...generatedRefinanceScenarios(25)];

  it('cash left, capital recycled, the surplus flag and the deal figures agree', () => {
    for (const s of scenarios) {
      const schedule = computeSchedule(s);
      const r = run(s);
      const deal = analyzeDeal(s, schedule);
      expect(r.cashLeft).toBe(roundCents(r.totalCashInvested - r.netProceeds));
      if (r.totalCashInvested > 0) {
        expect(r.capitalRecycledPct.value).toBeCloseTo(
          r.netProceeds / r.totalCashInvested,
          10,
        );
      }
      expect(r.allCashRecovered).toBe(r.cashLeft <= 0);
      expect(r.cashSurplus).toBe(
        r.allCashRecovered ? roundCents(-r.cashLeft) : 0,
      );
      expect(r.totalCashInvested).toBe(deal.totalCashInvested);
      expect(r.cashOnCashBefore).toEqual(deal.cashOnCashReturn);
      expect(r.cashFlowBefore).toBe(deal.cashFlow.annual);
      if (!r.allCashRecovered && r.cashFlowAfter != null) {
        expect(r.cashOnCashAfter.value).toBeCloseTo(
          r.cashFlowAfter / r.cashLeft,
          10,
        );
      }
    }
  });
});
