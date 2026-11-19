import { describe, expect, it } from 'vitest';
import type { FinancingTerms, LoanScenario } from 'shared-calculations';
import { buildFinancingMatrix } from './financing-matrix';
import type { FinancingOptionResult, FinancingPhase } from './types';
import {
  analyze,
  REFERENCE_TERMS,
  referenceScenario,
} from './__fixtures__/dscr-reference';

function matrixFor(scenario: LoanScenario) {
  return buildFinancingMatrix(scenario, analyze(scenario));
}

function option(
  scenario: LoanScenario,
  id: FinancingOptionResult['id'],
): FinancingOptionResult {
  const found = matrixFor(scenario).options?.find((o) => o.id === id);
  if (!found) throw new Error(`no ${id} option`);
  return found;
}

function phases(o: FinancingOptionResult): FinancingPhase[] {
  if (!o.phases) throw new Error(`${o.id} has no phases`);
  return o.phases;
}

describe('buildFinancingMatrix — reference scenario (research.md table)', () => {
  const matrix = matrixFor(referenceScenario());

  it('lists the three structures in order, conventional selected', () => {
    expect(matrix.options?.map((o) => o.id)).toEqual([
      'conventional',
      'arm',
      'dscr',
    ]);
    expect(matrix.selected).toBe('conventional');
    expect(matrix.isCustomized).toBe(false);
    expect(matrix.dscrMinimum).toBe(1.25);
    expect(matrix.naReason).toBeNull();
  });

  it('conventional: 30-yr fixed at 7%', () => {
    const conv = option(referenceScenario(), 'conventional');
    expect(conv).toMatchObject({
      name: 'Conventional',
      description: '30-yr fixed',
      loanAmount: 300_000,
      downPayment: 100_000,
      ltv: 0.75,
      totalCashInvested: 100_000,
      errors: [],
    });
    const [phase] = phases(conv);
    expect(phases(conv)).toHaveLength(1);
    expect(phase).toMatchObject({
      label: 'Years 1–30',
      fromYear: 1,
      toYear: 30,
      annualRatePct: 7,
      monthlyPrincipalAndInterest: 1995.91,
      monthlyPmi: 0,
      monthlyCashFlow: 380.09,
    });
    expect(phase.dscr.value?.toFixed(4)).toBe('1.1904');
    expect(phase.dscr.meetsMinimum).toBe(false);
    expect(phase.dscr.rentForMinimum).toBe(3954.4);
    expect(phase.cashOnCashReturn.value).toBeCloseTo(
      (380.09 * 12) / 100_000,
      12,
    );
  });

  it('ARM: 7/1, initial and after-reset phases', () => {
    const arm = option(referenceScenario(), 'arm');
    expect(arm.description).toBe('7/1 ARM');
    const [initial, reset] = phases(arm);
    expect(initial).toMatchObject({
      label: 'Initial (years 1–7)',
      fromYear: 1,
      toYear: 7,
      annualRatePct: 6.5,
      monthlyPrincipalAndInterest: 1896.2,
      monthlyCashFlow: 479.8,
    });
    expect(initial.dscr.value?.toFixed(4)).toBe('1.2530');
    expect(initial.dscr.meetsMinimum).toBe(true);
    expect(reset).toMatchObject({
      label: 'After reset (years 8–30)',
      fromYear: 8,
      toYear: 30,
      annualRatePct: 8.5,
      monthlyPrincipalAndInterest: 2240.75,
      monthlyCashFlow: 135.25,
    });
    expect(reset.dscr.value?.toFixed(4)).toBe('1.0604');
    expect(reset.dscr.meetsMinimum).toBe(false);
    expect(reset.dscr.rentForMinimum).toBe(4351.87);
  });

  it('DSCR loan: 30-yr at 8%', () => {
    const dscr = option(referenceScenario(), 'dscr');
    expect(dscr).toMatchObject({
      name: 'DSCR loan',
      description: '30-yr DSCR',
    });
    const [phase] = phases(dscr);
    expect(phase.monthlyPrincipalAndInterest).toBe(2201.29);
    expect(phase.monthlyCashFlow).toBe(174.71);
    expect(phase.dscr.value?.toFixed(4)).toBe('1.0794');
    expect(phase.dscr.meetsMinimum).toBe(false);
  });
});

describe('buildFinancingMatrix — rules', () => {
  it.each([
    [3, 20],
    [5.5, 25],
    [7, 30],
    [9, 10],
  ])(
    'untouched conventional cash flow equals the Deal Analyzer at %d%% / %d%% down (SC-005)',
    (rate, downPct) => {
      const price = 400_000;
      const scenario = referenceScenario({
        annualInterestRatePct: rate,
        downPayment: { percent: downPct },
        principal: price * (1 - downPct / 100),
        pmiAnnualRatePct: downPct < 20 ? 0.5 : null,
      });
      const conv = option(scenario, 'conventional');
      expect(phases(conv)[0].monthlyCashFlow).toBe(
        analyze(scenario).cashFlow.monthly,
      );
    },
  );

  it('charges PMI above 80% LTV on conventional and ARM only, never in DSCR', () => {
    const scenario = referenceScenario({
      downPayment: { percent: 10 },
      principal: 360_000,
      pmiAnnualRatePct: 0.5,
    });
    const conv = phases(option(scenario, 'conventional'))[0];
    const arm = phases(option(scenario, 'arm'));
    const dscrLoan = phases(option(scenario, 'dscr'))[0];
    expect(conv.monthlyPmi).toBe(150);
    expect(arm.map((p) => p.monthlyPmi)).toEqual([150, 150]);
    expect(dscrLoan.monthlyPmi).toBe(0);
    expect(conv.monthlyCashFlow).toBe(
      Math.round((2376 - conv.monthlyPrincipalAndInterest - 150) * 100) / 100,
    );
    // PMI is not P&I: the DSCR matches the same loan without PMI (R1, R6).
    const withoutPmi = referenceScenario({
      downPayment: { percent: 10 },
      principal: 360_000,
    });
    expect(conv.dscr.value).toBe(
      phases(option(withoutPmi, 'conventional'))[0].dscr.value,
    );
  });

  it('has no PMI without a PMI rate', () => {
    const scenario = referenceScenario({
      downPayment: { percent: 10 },
      principal: 360_000,
    });
    expect(phases(option(scenario, 'conventional'))[0].monthlyPmi).toBe(0);
  });

  it('requires a purchase price (FR-014)', () => {
    const matrix = matrixFor(referenceScenario({ homePrice: null }));
    expect(matrix.options).toBeNull();
    expect(matrix.naReason).toBe(
      'Enter a purchase price to compare financing options.',
    );
  });

  it('handles a 0% rate', () => {
    const conv = option(
      referenceScenario({ annualInterestRatePct: 0 }),
      'conventional',
    );
    expect(phases(conv)[0].monthlyPrincipalAndInterest).toBe(833.33);
  });

  it('honors the stored selection', () => {
    expect(
      matrixFor(referenceScenario({}, { financingSelection: 'arm' })).selected,
    ).toBe('arm');
  });

  it('adds closing costs and rehab to every option’s cash invested', () => {
    const matrix = matrixFor(
      referenceScenario({}, { closingCosts: 5_000, rehabBudget: 10_000 }),
    );
    expect(matrix.options?.map((o) => o.totalCashInvested)).toEqual([
      115_000, 115_000, 115_000,
    ]);
  });

  it('reports no cash invested at 0% down with no costs', () => {
    const stored: FinancingTerms = {
      ...REFERENCE_TERMS,
      dscr: { ...REFERENCE_TERMS.dscr, downPaymentPct: 0 },
    };
    const dscr = option(referenceScenario({}, { financing: stored }), 'dscr');
    expect(dscr.totalCashInvested).toBe(0);
    expect(phases(dscr)[0].cashOnCashReturn).toEqual({
      value: null,
      naReason: 'No cash invested — Cash-on-Cash Return is undefined.',
    });
  });
});

describe('buildFinancingMatrix — edited terms (spec 006 US3)', () => {
  it('recomputes only the edited structure', () => {
    const base = matrixFor(referenceScenario());
    const stored: FinancingTerms = {
      ...REFERENCE_TERMS,
      dscr: { downPaymentPct: 20, annualRatePct: 7.5, termYears: 30 },
    };
    const edited = matrixFor(referenceScenario({}, { financing: stored }));
    expect(edited.isCustomized).toBe(true);
    expect(edited.options?.[2].loanAmount).toBe(320_000);
    expect(edited.options?.[0]).toEqual(base.options?.[0]);
    expect(edited.options?.[1]).toEqual(base.options?.[1]);
  });

  it('blanks only an option with invalid terms', () => {
    const stored: FinancingTerms = {
      ...REFERENCE_TERMS,
      arm: { ...REFERENCE_TERMS.arm, termYears: 5, fixedPeriodYears: 7 },
    };
    const matrix = matrixFor(referenceScenario({}, { financing: stored }));
    const [conv, arm, dscr] = matrix.options ?? [];
    expect(arm.phases).toBeNull();
    expect(arm.errors).toEqual([
      {
        field: 'rental.financing.arm.fixedPeriodYears',
        message: 'Fixed period must be shorter than the term.',
      },
    ]);
    expect(conv.phases).not.toBeNull();
    expect(dscr.phases).not.toBeNull();
  });

  it('survives malformed stored terms without throwing', () => {
    const malformed = {
      conventional: REFERENCE_TERMS.conventional,
      dscr: REFERENCE_TERMS.dscr,
    } as unknown as FinancingTerms;
    const matrix = matrixFor(referenceScenario({}, { financing: malformed }));
    const [conv, arm, dscr] = matrix.options ?? [];
    expect(arm.phases).toBeNull();
    expect(arm.errors.length).toBeGreaterThan(0);
    expect(conv.phases).not.toBeNull();
    expect(dscr.phases).not.toBeNull();
  });
});
