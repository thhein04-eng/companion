import {
  computeSchedule,
  type FinancingTerms,
  type LoanScenario,
  type RentalAssumptions,
} from 'shared-calculations';
import { analyzeDeal, DEFAULT_RENTAL_ASSUMPTIONS } from '../analyze-deal';
import type { DealAnalysis } from '../types';

/**
 * Spec 006 reference scenario (research.md § Reference scenario): $400k price, 25% down,
 * 7% / 30yr, $4,800/yr tax, $1,800/yr insurance, $3,800 rent, default 5/8/5/5% reserves.
 * NOI = $2,376.00/mo = $28,512.00/yr.
 */
export function referenceScenario(
  overrides: Partial<LoanScenario> = {},
  rentalOverrides: Partial<RentalAssumptions> = {},
): LoanScenario {
  return {
    id: 'dscr-ref',
    name: 'DSCR reference',
    principal: 300_000,
    annualInterestRatePct: 7,
    termMonths: 360,
    startDate: '2027-01-01',
    paymentFrequency: 'monthly',
    homePrice: 400_000,
    downPayment: { percent: 25 },
    annualPropertyTax: 4_800,
    annualInsurance: 1_800,
    pmiAnnualRatePct: null,
    monthlyHoa: null,
    extraPayments: [],
    principalIsOverridden: false,
    rental: {
      ...DEFAULT_RENTAL_ASSUMPTIONS,
      grossMonthlyRent: 3_800,
      ...rentalOverrides,
    },
    ...overrides,
  };
}

/** The financing terms derived from `referenceScenario()` (data-model §A defaults). */
export const REFERENCE_TERMS: FinancingTerms = {
  conventional: { downPaymentPct: 25, annualRatePct: 7, termYears: 30 },
  arm: {
    downPaymentPct: 25,
    annualRatePct: 6.5,
    termYears: 30,
    fixedPeriodYears: 7,
    adjustedRatePct: 8.5,
  },
  dscr: { downPaymentPct: 25, annualRatePct: 8, termYears: 30 },
};

export function analyze(scenario: LoanScenario): DealAnalysis {
  return analyzeDeal(scenario, computeSchedule(scenario));
}
