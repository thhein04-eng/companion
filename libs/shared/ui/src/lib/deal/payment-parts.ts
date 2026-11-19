import {
  roundCents,
  type AmortizationSchedule,
  type LoanScenario,
} from 'shared-calculations';
import type { DealPayment, PaymentPart } from './page-profiles';

/**
 * The total monthly payment split into its parts (spec 010 T037): P&I, property tax / 12,
 * insurance / 12, PMI (while it applies at the first payment) and HOA, each cents-rounded.
 * Null inputs count as 0.
 */
export function paymentParts(
  scenario: LoanScenario,
  summary: AmortizationSchedule['summary'],
  pmiAppliesAtStart: boolean,
): PaymentPart[] {
  return [
    {
      field: 'principalAndInterest',
      label: 'Principal & interest',
      monthly: summary.monthlyPrincipalAndInterest,
    },
    {
      field: 'annualPropertyTax',
      label: 'Property tax',
      monthly: roundCents((scenario.annualPropertyTax ?? 0) / 12),
    },
    {
      field: 'annualInsurance',
      label: 'Insurance',
      monthly: roundCents((scenario.annualInsurance ?? 0) / 12),
    },
    {
      field: 'pmiAnnualRatePct',
      label: 'PMI',
      monthly: pmiAppliesAtStart ? summary.monthlyPmiAmount : 0,
    },
    {
      field: 'monthlyHoa',
      label: 'HOA',
      monthly: roundCents(scenario.monthlyHoa ?? 0),
    },
  ];
}

/** The strip / sheet payment summary from a computed schedule, or null while inputs are invalid. */
export function dealPayment(
  scenario: LoanScenario,
  schedule: AmortizationSchedule | null,
): DealPayment | null {
  if (!schedule) return null;
  return {
    principalAndInterest: schedule.summary.monthlyPrincipalAndInterest,
    total: schedule.summary.totalMonthlyPayment,
    parts: paymentParts(
      scenario,
      schedule.summary,
      schedule.periods[0]?.pmiApplies ?? false,
    ),
    pmiDropPeriod: schedule.summary.pmiDropPeriod,
  };
}
