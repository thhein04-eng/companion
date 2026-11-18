import {
  monthlyPayment,
  remainingBalance,
  roundCents,
  type ArmTerms,
  type FinancingOptionId,
  type LoanScenario,
  type LoanTerms,
  type RatioResult,
  type RentalAssumptions,
} from 'shared-calculations';
import { computeDscr, resolveDscrMinimum } from './dscr';
import { resolveFinancingTerms } from './financing';
import type {
  DealAnalysis,
  FinancingMatrix,
  FinancingOptionResult,
  FinancingPhase,
} from './types';
import { validateFinancing } from './validate-financing';

const PMI_LTV_THRESHOLD = 0.8;
const NAMES: Record<FinancingOptionId, FinancingOptionResult['name']> = {
  conventional: 'Conventional',
  arm: 'ARM',
  dscr: 'DSCR loan',
};
const ORDER: FinancingOptionId[] = ['conventional', 'arm', 'dscr'];

function describe(id: FinancingOptionId, terms: LoanTerms | ArmTerms): string {
  if (id === 'arm') return `${(terms as ArmTerms).fixedPeriodYears}/1 ARM`;
  return id === 'dscr'
    ? `${terms.termYears}-yr DSCR`
    : `${terms.termYears}-yr fixed`;
}

/**
 * Compares a conventional fixed loan, an ARM and a DSCR loan on the same
 * property (spec 006 User Story 2, contracts/dscr-financing-calculations.md).
 * Preconditions: `scenario` passed `validateScenario`, `scenario.rental` is
 * valid, and `analysis = analyzeDeal(scenario, computeSchedule(scenario))`.
 */
export function buildFinancingMatrix(
  scenario: LoanScenario,
  analysis: DealAnalysis,
): FinancingMatrix {
  const rental = scenario.rental as RentalAssumptions;
  const selected = rental.financingSelection ?? 'conventional';
  const dscrMinimum = resolveDscrMinimum(rental);
  const price = scenario.homePrice;

  if (price == null || price <= 0) {
    return {
      options: null,
      naReason: 'Enter a purchase price to compare financing options.',
      selected,
      isCustomized: rental.financing != null,
      dscrMinimum,
    };
  }

  const { terms, isCustomized } = resolveFinancingTerms(scenario);
  const errors = validateFinancing(rental, terms);
  const noiMonthly = analysis.netOperatingIncome.monthly;

  const phase = (
    id: FinancingOptionId,
    loan: number,
    ltv: number,
    totalCashInvested: number,
    p: {
      label: string;
      fromYear: number;
      toYear: number;
      annualRatePct: number;
      rawPayment: number;
    },
  ): FinancingPhase => {
    const pi = roundCents(p.rawPayment);
    const pmi =
      id !== 'dscr' &&
      ltv > PMI_LTV_THRESHOLD &&
      scenario.pmiAnnualRatePct != null
        ? roundCents(((scenario.pmiAnnualRatePct / 100) * loan) / 12)
        : 0;
    const monthlyCashFlow = roundCents(noiMonthly - pi - pmi);
    const cashOnCashReturn: RatioResult =
      totalCashInvested > 0
        ? { value: (monthlyCashFlow * 12) / totalCashInvested, naReason: null }
        : {
            value: null,
            naReason: 'No cash invested — Cash-on-Cash Return is undefined.',
          };
    return {
      label: p.label,
      fromYear: p.fromYear,
      toYear: p.toYear,
      annualRatePct: p.annualRatePct,
      monthlyPrincipalAndInterest: pi,
      monthlyPmi: pmi,
      monthlyCashFlow,
      cashOnCashReturn,
      dscr: computeDscr({
        scenario,
        annualNoi: analysis.netOperatingIncome.annual,
        monthlyPrincipalAndInterest: pi,
        minimum: dscrMinimum,
      }),
    };
  };

  const options = ORDER.map((id): FinancingOptionResult => {
    const optionTerms = (terms as Partial<typeof terms>)[id] ?? null;
    const optionErrors = errors.filter((e) =>
      e.field.startsWith(`rental.financing.${id}.`),
    );
    const name = NAMES[id];

    if (!optionTerms || optionErrors.length > 0) {
      return {
        id,
        name,
        description: optionTerms ? safeDescribe(id, optionTerms) : '',
        terms: optionTerms as LoanTerms,
        loanAmount: 0,
        downPayment: 0,
        ltv: 0,
        totalCashInvested: 0,
        phases: null,
        errors: optionErrors,
      };
    }

    const loan = roundCents(price * (1 - optionTerms.downPaymentPct / 100));
    const downPayment = roundCents(price - loan);
    const ltv = loan / price;
    const totalCashInvested = roundCents(
      downPayment + rental.closingCosts + rental.rehabBudget,
    );
    const termMonths = optionTerms.termYears * 12;
    const phaseFor = (p: Parameters<typeof phase>[4]) =>
      phase(id, loan, ltv, totalCashInvested, p);

    let phases: FinancingPhase[];
    if (id === 'arm') {
      const arm = optionTerms as ArmTerms;
      const fixedMonths = arm.fixedPeriodYears * 12;
      const balance = remainingBalance(
        loan,
        arm.annualRatePct,
        termMonths,
        fixedMonths,
      );
      phases = [
        phaseFor({
          label: `Initial (years 1–${arm.fixedPeriodYears})`,
          fromYear: 1,
          toYear: arm.fixedPeriodYears,
          annualRatePct: arm.annualRatePct,
          rawPayment: monthlyPayment(loan, arm.annualRatePct, termMonths),
        }),
        phaseFor({
          label: `After reset (years ${arm.fixedPeriodYears + 1}–${arm.termYears})`,
          fromYear: arm.fixedPeriodYears + 1,
          toYear: arm.termYears,
          annualRatePct: arm.adjustedRatePct,
          rawPayment: monthlyPayment(
            balance,
            arm.adjustedRatePct,
            termMonths - fixedMonths,
          ),
        }),
      ];
    } else {
      phases = [
        phaseFor({
          label: `Years 1–${optionTerms.termYears}`,
          fromYear: 1,
          toYear: optionTerms.termYears,
          annualRatePct: optionTerms.annualRatePct,
          rawPayment: monthlyPayment(
            loan,
            optionTerms.annualRatePct,
            termMonths,
          ),
        }),
      ];
    }

    return {
      id,
      name,
      description: describe(id, optionTerms),
      terms: optionTerms,
      loanAmount: loan,
      downPayment,
      ltv,
      totalCashInvested,
      phases,
      errors: [],
    };
  });

  return { options, naReason: null, selected, isCustomized, dscrMinimum };
}

/** `describe` for terms that failed validation and may be malformed. */
function safeDescribe(
  id: FinancingOptionId,
  terms: LoanTerms | ArmTerms,
): string {
  try {
    return describe(id, terms);
  } catch {
    return '';
  }
}
