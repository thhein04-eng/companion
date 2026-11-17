import { describe, expect, it } from 'vitest';
import { analyzeDeal, DEFAULT_RENTAL_ASSUMPTIONS } from './analyze-deal';
import { computeSchedule } from './compute-schedule';
import { EQUITY_NA_REASON, growthRates, projectRental } from './project-rental';
import { roundCents } from './round';
import type { LoanScenario, RentalAssumptions } from './types';
import { R2, R3 } from './__fixtures__/reference-scenarios';

/** D1: R3's loan with $2,800 rent, default Deal Analyzer percentages and $6,000 closing costs. */
function d1(rental: Partial<RentalAssumptions> = {}, loan: Partial<LoanScenario> = {}): LoanScenario {
  return {
    ...R3,
    ...loan,
    rental: { ...DEFAULT_RENTAL_ASSUMPTIONS, grossMonthlyRent: 2_800, closingCosts: 6_000, ...rental },
  };
}

function project(scenario: LoanScenario) {
  const schedule = computeSchedule(scenario);
  return { schedule, projection: projectRental(scenario, schedule) };
}

const within = (a: number, b: number, tol = 0.01) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe('projectRental (US6, FR-011/FR-012)', () => {
  it('D1 at 0% growth: 30 years and year 1 equals the Deal Analyzer exactly', () => {
    const scenario = d1();
    const { schedule, projection } = project(scenario);
    const deal = analyzeDeal(scenario, schedule);

    expect(projection.years).toHaveLength(30);
    const y1 = projection.years[0];
    expect(y1.noi).toBe(deal.netOperatingIncome.annual);
    expect(y1.debtService).toBe(deal.debtService.annual);
    expect(y1.cashFlow).toBe(deal.cashFlow.annual);
    expect(y1.cashOnCash).toBe(deal.cashOnCashReturn.value);
    expect(projection.totalCashInvested).toBe(39_000); // $33,000 down + $6,000 closing
    for (const y of projection.years) {
      expect(y.noi).toBe(y1.noi);
      expect(y.appreciation).toBe(0);
    }
  });

  it('rent growth 3%: income and percent-of-income lines scale by 1.03 per year', () => {
    const { projection } = project(d1({ rentGrowthPct: 3 }));
    const [y1, y2] = projection.years;
    within(y2.grossIncome, roundCents(y1.grossIncome * 1.03));
    // Fixed lines (tax $3,600 + insurance $1,200 + HOA $600 = $5,400/yr) stay flat; the rest scale.
    within(y2.operatingExpenses - 5_400, (y1.operatingExpenses - 5_400) * 1.03, 0.02);
  });

  it('expense growth 2%: fixed lines scale by 1.02; percent lines do not', () => {
    const { projection } = project(d1({ expenseGrowthPct: 2 }));
    const [y1, y2] = projection.years;
    expect(y2.grossIncome).toBe(y1.grossIncome);
    within(y2.operatingExpenses - y1.operatingExpenses, 5_400 * 0.02, 0.02);
  });

  it('appreciation 3%: home value compounds and the equity identity holds every year', () => {
    const { projection } = project(d1({ appreciationPct: 3 }));
    expect(projection.years[0].homeValue).toBe(roundCents(330_000 * 1.03));
    expect(projection.years[0].initialEquity).toBe(33_000);
    for (const y of projection.years) {
      within(
        (y.initialEquity as number) + y.principalPaid + (y.appreciation as number),
        (y.homeValue as number) - y.loanBalance
      );
    }
  });

  it('principal paid tracks the schedule: year 1 within a few cents of Σ principal', () => {
    const scenario = d1();
    const { schedule, projection } = project(scenario);
    const sumYear1 = schedule.periods.slice(0, 12).reduce((s, p) => s + p.principalPortion, 0);
    within(projection.years[0].principalPaid, sumYear1, 0.05);
  });

  it("R2's extra payment: debt service is 0 after payoff, cash flow equals NOI, still 30 years", () => {
    const scenario = d1({}, { extraPayments: R2.extraPayments });
    const { schedule, projection } = project(scenario);
    expect(projection.years).toHaveLength(30);
    const payoffYear = Math.ceil(schedule.periods.length / 12);
    expect(payoffYear).toBeLessThan(30);
    for (const y of projection.years.slice(payoffYear)) {
      expect(y.debtService).toBe(0);
      expect(y.loanBalance).toBe(0);
      expect(y.cashFlow).toBe(y.noi);
    }
  });

  it('PMI drop: the year after the drop year has 12 fewer PMI payments in debt service', () => {
    const scenario = d1();
    const { schedule, projection } = project(scenario);
    const dropPeriod = schedule.summary.pmiDropPeriod as number;
    expect(dropPeriod).not.toBeNull();
    const yearAfterDrop = Math.ceil(dropPeriod / 12) + 1;
    const full = projection.years[0].debtService;
    const after = projection.years[yearAfterDrop - 1].debtService;
    within(full - after, schedule.summary.monthlyPmiAmount * 12);
  });

  it('no purchase price: equity fields are null with a reason', () => {
    const { projection } = project(d1({}, { homePrice: null, downPayment: null }));
    expect(projection.equityNaReason).toBe(EQUITY_NA_REASON);
    for (const y of projection.years) {
      expect(y.homeValue).toBeNull();
      expect(y.initialEquity).toBeNull();
      expect(y.appreciation).toBeNull();
    }
  });

  it('no cash invested: cash-on-cash is null with the Deal Analyzer reason', () => {
    const scenario = d1({ closingCosts: 0, rehabBudget: 0 }, { downPayment: null });
    const { schedule, projection } = project(scenario);
    expect(projection.years[0].cashOnCash).toBeNull();
    expect(projection.cashOnCashNaReason).toBe(analyzeDeal(scenario, schedule).cashOnCashReturn.naReason);
  });

  it('negative appreciation (−5%): appreciation is negative and the identity still holds', () => {
    const { projection } = project(d1({ appreciationPct: -5 }));
    for (const y of projection.years) {
      expect(y.appreciation as number).toBeLessThan(0);
      within(
        (y.initialEquity as number) + y.principalPaid + (y.appreciation as number),
        (y.homeValue as number) - y.loanBalance
      );
    }
  });
});

describe('growthRates', () => {
  it('treats missing fields as 0', () => {
    const { rentGrowthPct, expenseGrowthPct, appreciationPct, ...legacy } = DEFAULT_RENTAL_ASSUMPTIONS;
    void rentGrowthPct;
    void expenseGrowthPct;
    void appreciationPct;
    expect(growthRates({ ...legacy, grossMonthlyRent: 2_000 })).toEqual({ rent: 0, expense: 0, appreciation: 0 });
  });
});
