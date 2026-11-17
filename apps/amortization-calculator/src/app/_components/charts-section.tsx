'use client';

import { useMemo } from 'react';
import { computeBaselineSchedule, type AmortizationSchedule, type LoanScenario } from 'amortization-calculations';
import { BalanceChart, PaymentCompositionBar, PrincipalInterestChart } from 'amortization-ui';

export interface ChartsSectionProps {
  scenario: LoanScenario;
  schedule: AmortizationSchedule;
}

/** The amortization charts, placed directly above the schedule (FR-014). */
export function ChartsSection({ scenario, schedule }: ChartsSectionProps) {
  const baseline = useMemo(() => computeBaselineSchedule(scenario), [scenario]);
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium text-neutral-800">Charts</h2>
      <div className="grid gap-6">
        <PaymentCompositionBar scenario={scenario} schedule={schedule} />
        <BalanceChart schedule={schedule} baseline={baseline} />
        <PrincipalInterestChart schedule={schedule} />
      </div>
    </section>
  );
}
