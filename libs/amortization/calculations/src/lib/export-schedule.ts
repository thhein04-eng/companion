import type { AmortizationSchedule } from 'shared-calculations';

const HEADER = [
  'Payment #',
  'Date',
  'Payment',
  'Principal',
  'Interest',
  'Remaining Balance',
];

/** Renders a full `AmortizationSchedule` as CSV: a header row plus one row per period (FR-011). */
export function scheduleToCsv(schedule: AmortizationSchedule): string {
  const rows = schedule.periods.map((period) =>
    [
      period.periodNumber,
      period.date,
      period.paymentAmount.toFixed(2),
      period.principalPortion.toFixed(2),
      period.interestPortion.toFixed(2),
      period.remainingBalance.toFixed(2),
    ].join(','),
  );
  return [HEADER.join(','), ...rows].join('\n');
}
