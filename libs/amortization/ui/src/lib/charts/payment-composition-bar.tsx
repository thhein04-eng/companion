'use client';

import { useMemo } from 'react';
import {
  buildPaymentComposition,
  type PaymentComponent,
} from 'amortization-calculations';
import type { AmortizationSchedule, LoanScenario } from 'shared-calculations';
import { SegmentedBar, type SeriesSlot } from '@companion/charts';
import { formatUsd } from './format';

/** Fixed slots per component, so the same cost keeps the same color everywhere. */
const SLOTS: Record<PaymentComponent['key'], SeriesSlot> = {
  principalAndInterest: 1,
  propertyTax: 3,
  insurance: 4,
  pmi: 5,
  hoa: 7,
};

export interface PaymentCompositionBarProps {
  scenario: LoanScenario;
  schedule: AmortizationSchedule;
}

/**
 * What one monthly payment is made of (US3, FR-003). Renders nothing when principal & interest is
 * the only component, because one segment is not worth a chart.
 */
export function PaymentCompositionBar({
  scenario,
  schedule,
}: PaymentCompositionBarProps) {
  const { components, total } = useMemo(
    () => buildPaymentComposition(scenario, schedule),
    [scenario, schedule],
  );
  if (components.length < 2) return null;
  return (
    <SegmentedBar
      title="Monthly payment breakdown"
      data-testid="chart-payment-composition"
      segments={components.map((c) => ({
        key: c.key,
        label: c.label,
        value: c.value,
        color: SLOTS[c.key],
      }))}
      total={total}
      formatValue={formatUsd}
    />
  );
}
