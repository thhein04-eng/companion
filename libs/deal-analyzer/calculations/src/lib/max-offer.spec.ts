import {
  computeSchedule,
  type LoanScenario,
  type RentUnit,
} from 'shared-calculations';
import { describe, expect, it } from 'vitest';
import { referenceScenario } from './__fixtures__/dscr-reference';
import { generatedScenarios } from './__fixtures__/generated-scenarios';
import { analyzeDeal } from './analyze-deal';
import { maxAllowableOffer } from './max-offer';
import { evaluateVariant, meetsTarget, scenarioVariant } from './sensitivity';
import type { SensitivityTarget } from './validate-sensitivity';

/**
 * Spec 015 Max Allowable Offer (Constitution I; FR-012, SC-002): the offer meets the target and
 * $1 more does not, checked against the Deal Analyzer itself.
 */
const vectorA = (over: Partial<LoanScenario> = {}) =>
  referenceScenario(
    {
      homePrice: 250_000,
      principal: 187_500,
      annualInterestRatePct: 7,
      annualPropertyTax: 3_000,
      annualInsurance: 1_200,
      ...over,
    },
    { grossMonthlyRent: 2_400 },
  );

const cashFlow = (value: number): SensitivityTarget => ({
  measure: 'cashFlow',
  value,
});
const cashOnCash = (value: number): SensitivityTarget => ({
  measure: 'cashOnCash',
  value,
});

/** Does the deal meet the target at this price? */
const meetsAt = (s: LoanScenario, t: SensitivityTarget, price: number) =>
  meetsTarget(evaluateVariant(scenarioVariant(s, { price })), t) === true;

/** The boundary: the offer meets the target and $1 more does not. */
function expectBoundary(s: LoanScenario, t: SensitivityTarget, price: number) {
  expect(meetsAt(s, t, price)).toBe(true);
  expect(meetsAt(s, t, price + 1)).toBe(false);
}

const unit = (over: Partial<RentUnit> & { id: string }): RentUnit => ({
  name: `Unit ${over.id.toUpperCase()}`,
  bedrooms: null,
  bathrooms: null,
  rent: 0,
  vacancyPct: null,
  ownerOccupied: false,
  rentAfterMoveOut: null,
  ...over,
});

describe('maxAllowableOffer (spec 015 data-model §E)', () => {
  it('finds the highest price for a $300/mo cash-flow target on the reference deal', () => {
    const s = vectorA();
    const r = maxAllowableOffer(s, cashFlow(300));
    expect(r.status).toBe('found');
    if (r.status !== 'found') return;
    expectBoundary(s, cashFlow(300), r.price);
    expect(Number.isInteger(r.price)).toBe(true);
    expect(r.price).toBeLessThan(250_000); // $250.56 today is below $300
    expect(r.currentMeets).toBe(false);
    expect(r.deltaFromCurrent).toBe(r.price - 250_000);
    expect(r.deltaPct).toBe((r.price - 250_000) / 250_000);
    expect(r.atCurrent.cashFlowMonthly).toBe(250.56);
    expect(r.atOffer.cashFlowMonthly).toBeGreaterThanOrEqual(300);
  });

  it('finds the highest price for an 8% Cash-on-Cash target', () => {
    const s = vectorA();
    const r = maxAllowableOffer(s, cashOnCash(8));
    expect(r.status).toBe('found');
    if (r.status !== 'found') return;
    expectBoundary(s, cashOnCash(8), r.price);
    expect(r.atOffer.cashOnCash).toBeGreaterThanOrEqual(0.08);
    expect(r.atCurrent.cashOnCash).toBe(
      analyzeDeal(s, computeSchedule(s)).cashOnCashReturn.value,
    );
  });

  it('says the current price already meets an easy target, and still gives the higher price', () => {
    const s = vectorA();
    const r = maxAllowableOffer(s, cashFlow(100));
    expect(r.status).toBe('found');
    if (r.status !== 'found') return;
    expect(r.currentMeets).toBe(true);
    expect(r.price).toBeGreaterThan(250_000);
    expect(r.deltaFromCurrent).toBeGreaterThan(0);
    expectBoundary(s, cashFlow(100), r.price);
  });

  it('gives the same break-even price for $0/mo cash flow and 0% Cash-on-Cash', () => {
    const s = vectorA();
    const a = maxAllowableOffer(s, cashFlow(0));
    const b = maxAllowableOffer(s, cashOnCash(0));
    expect(a.status).toBe('found');
    expect(b).toEqual(
      a.status === 'found' ? expect.objectContaining({ price: a.price }) : a,
    );
  });

  it('holds at the $1 boundary for 50 varied deals, both measures (SC-002)', () => {
    let found = 0;
    for (const s of generatedScenarios(50)) {
      for (const t of [cashFlow(0), cashFlow(250), cashOnCash(5)]) {
        const r = maxAllowableOffer(s, t);
        if (r.status === 'found') {
          expectBoundary(s, t, r.price);
          found++;
        } else {
          expect(r.status).toBe('unreachable');
        }
      }
    }
    expect(found).toBeGreaterThanOrEqual(120); // most of the 150 searches have an answer
  });

  it('handles a fixed-dollar down payment (the loan grows with the price, so PMI can start)', () => {
    const s = vectorA({
      downPayment: { amount: 50_000 },
      principal: 200_000,
      pmiAnnualRatePct: 0.5,
    });
    for (const t of [cashFlow(0), cashOnCash(6)]) {
      const r = maxAllowableOffer(s, t);
      expect(r.status).toBe('found');
      if (r.status === 'found') expectBoundary(s, t, r.price);
    }
  });

  it('handles a directly entered loan, where low prices are not valid deals', () => {
    // Loan $100,000 typed in: below ~$116,667 the loan would go negative, so those prices are
    // not valid, but a valid price still meets the target.
    const s = vectorA({ principal: 100_000, principalIsOverridden: true });
    const r = maxAllowableOffer(s, cashFlow(0));
    expect(r.status).toBe('found');
    if (r.status === 'found') expectBoundary(s, cashFlow(0), r.price);
  });

  it('works on a rent roll with an owner-occupied unit and RUBS (spec 012)', () => {
    const s = referenceScenario(
      {},
      {
        grossMonthlyRent: 2_750,
        vacancyPct: 5,
        customExpenses: [
          { id: 'w', label: 'Water', monthlyAmount: 180, paidBy: 'rubs' },
        ],
        units: [
          unit({ id: 'a', ownerOccupied: true, rentAfterMoveOut: 1_350 }),
          unit({ id: 'b', rent: 1_400 }),
        ],
      },
    );
    for (const t of [cashFlow(0), cashOnCash(5)]) {
      const r = maxAllowableOffer(s, t);
      expect(r.status).toBe('found');
      if (r.status === 'found') expectBoundary(s, t, r.price);
    }
  });

  it('says no price reaches a target the rent cannot support, without a number', () => {
    const reason =
      'No price reaches this target at this rent and rate. A higher rent or a lower rate would help.';
    // $2,400 of rent can't produce $5,000/mo at any price.
    expect(maxAllowableOffer(vectorA(), cashFlow(5_000))).toEqual({
      status: 'unreachable',
      reason,
    });
    // With $10,000 of closing costs, cash invested never falls below that, so the return is
    // capped near 180% however low the price.
    const base = vectorA();
    const withClosing: LoanScenario = {
      ...base,
      rental: {
        ...(base.rental as NonNullable<LoanScenario['rental']>),
        closingCosts: 10_000,
      },
    };
    expect(maxAllowableOffer(withClosing, cashOnCash(1_000))).toEqual({
      status: 'unreachable',
      reason,
    });
  });

  it('can reach a huge Cash-on-Cash when there are no closing costs: cash invested shrinks with the price', () => {
    const s = vectorA();
    const r = maxAllowableOffer(s, cashOnCash(1_000));
    expect(r.status).toBe('found');
    if (r.status === 'found') {
      expectBoundary(s, cashOnCash(1_000), r.price);
      expect(r.price).toBeLessThan(10_000);
    }
  });

  it('explains an undefined Cash-on-Cash when nothing is ever invested', () => {
    const s = vectorA({ downPayment: { amount: 0 }, principal: 250_000 });
    const r = maxAllowableOffer(s, cashOnCash(8));
    expect(r.status).toBe('unreachable');
    if (r.status === 'unreachable')
      expect(r.reason).toContain('No cash invested');
  });

  it('is invalid for a bad target, or a deal that cannot be analyzed', () => {
    expect(maxAllowableOffer(vectorA(), cashOnCash(-1))).toEqual({
      status: 'invalid',
      reason: 'Use 0–1000%',
    });
    expect(maxAllowableOffer(vectorA(), cashFlow(Number.NaN)).status).toBe(
      'invalid',
    );
    expect(
      maxAllowableOffer({ ...vectorA(), rental: null }, cashFlow(300)).status,
    ).toBe('invalid');
    expect(
      maxAllowableOffer(vectorA({ downPayment: null }), cashFlow(300)).status,
    ).toBe('invalid');
    expect(
      maxAllowableOffer(vectorA({ homePrice: null }), cashFlow(300)).status,
    ).toBe('invalid');
  });

  it('returns the search cap when an extremely leveraged deal still meets the target there', () => {
    // 99.9% down: the loan is 0.1% of the price, so even at $10 billion the payment is small.
    const s = vectorA({ downPayment: { percent: 99.9 }, principal: 250 });
    const r = maxAllowableOffer(s, cashFlow(-1_000_000));
    expect(r.status).toBe('found');
    if (r.status === 'found') expect(r.price).toBe(10_000_000_000);
  });

  it('agrees with a brute-force scan of the price, to within the scan step', () => {
    const step = 5_000;
    for (const s of generatedScenarios(6)) {
      for (const t of [cashFlow(100), cashOnCash(4)]) {
        const r = maxAllowableOffer(s, t);
        if (r.status !== 'found') continue;
        const current = s.homePrice ?? 0;
        let best = 0;
        for (let p = step; p <= current * 2; p += step)
          if (meetsAt(s, t, p)) best = p;
        expect(r.price).toBeGreaterThanOrEqual(best);
        expect(r.price).toBeLessThan(best + step);
      }
    }
  }, 30_000);

  it('finds an offer in under 100 ms on the reference deal (SC-004)', () => {
    const started = performance.now();
    maxAllowableOffer(vectorA(), cashFlow(300));
    expect(performance.now() - started).toBeLessThan(100);
  });

  it('does not mutate the scenario', () => {
    const s = vectorA();
    const copy = structuredClone(s);
    maxAllowableOffer(s, cashFlow(300));
    expect(s).toEqual(copy);
  });
});
