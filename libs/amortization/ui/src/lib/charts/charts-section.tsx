'use client';

import { useMemo } from 'react';
import { computeBaselineSchedule } from 'amortization-calculations';
import type { AmortizationSchedule, LoanScenario } from 'shared-calculations';
import { BalanceChart } from './balance-chart';
import { PaymentCompositionBar } from './payment-composition-bar';
import { PrincipalInterestChart } from './principal-interest-chart';

export interface ChartsSectionProps {
  scenario: LoanScenario;
  schedule: AmortizationSchedule;
}

/** The amortization charts, placed directly above the schedule (spec 005 FR-014). */
export function ChartsSection({ scenario, schedule }: ChartsSectionProps) {
  const baseline = useMemo(() => computeBaselineSchedule(scenario), [scenario]);
  return (
    <section className="flex flex-col gap-[var(--space-section)]">
      <h2 className="m-0 font-display text-h2 font-semibold text-fg">Charts</h2>
      <div className="grid gap-[var(--space-card)]">
        <PaymentCompositionBar scenario={scenario} schedule={schedule} />
        <BalanceChart schedule={schedule} baseline={baseline} />
        <PrincipalInterestChart schedule={schedule} />
      </div>
    </section>
  );
}
