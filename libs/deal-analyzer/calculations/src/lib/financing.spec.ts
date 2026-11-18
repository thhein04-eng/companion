import { describe, expect, it } from 'vitest';
import type { FinancingTerms } from 'shared-calculations';
import { defaultFinancingTerms, resolveFinancingTerms } from './financing';
import {
  REFERENCE_TERMS,
  referenceScenario,
} from './__fixtures__/dscr-reference';

describe('defaultFinancingTerms (spec 006 FR-009)', () => {
  it('derives the reference terms from the scenario', () => {
    expect(defaultFinancingTerms(referenceScenario())).toEqual(REFERENCE_TERMS);
  });

  it('floors the ARM initial rate at 0', () => {
    const terms = defaultFinancingTerms(
      referenceScenario({ annualInterestRatePct: 0.3 }),
    );
    expect(terms.arm.annualRatePct).toBe(0);
    expect(terms.arm.adjustedRatePct).toBe(1.8);
    expect(terms.dscr.annualRatePct).toBe(1.3);
  });

  it('respects an overridden loan amount', () => {
    const terms = defaultFinancingTerms(
      referenceScenario({ principal: 320_000, principalIsOverridden: true }),
    );
    expect(terms.conventional.downPaymentPct).toBe(20);
    expect(terms.arm.downPaymentPct).toBe(20);
    expect(terms.dscr.downPaymentPct).toBe(25);
  });

  it('floors the down payment at 0 when the loan exceeds the price', () => {
    const terms = defaultFinancingTerms(
      referenceScenario({ principal: 420_000, principalIsOverridden: true }),
    );
    expect(terms.conventional.downPaymentPct).toBe(0);
  });
});

describe('resolveFinancingTerms (spec 006 FR-012)', () => {
  it('derives the terms while none are stored', () => {
    for (const financing of [undefined, null]) {
      expect(
        resolveFinancingTerms(referenceScenario({}, { financing })),
      ).toEqual({ terms: REFERENCE_TERMS, isCustomized: false });
    }
  });

  it('returns stored terms as customized', () => {
    const stored: FinancingTerms = {
      ...REFERENCE_TERMS,
      dscr: { downPaymentPct: 20, annualRatePct: 7.5, termYears: 30 },
    };
    expect(
      resolveFinancingTerms(referenceScenario({}, { financing: stored })),
    ).toEqual({ terms: stored, isCustomized: true });
  });
});
