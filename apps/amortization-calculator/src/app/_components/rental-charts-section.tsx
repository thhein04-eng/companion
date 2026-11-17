'use client';

import { useMemo } from 'react';
import { projectRental, type AmortizationSchedule, type LoanScenario } from 'amortization-calculations';
import { CashOnCashChart, EquityBuildUpChart, RentalCashFlowChart } from 'amortization-ui';

export interface RentalChartsSectionProps {
  /** A valid scenario with a valid `rental` (the page only renders this when `analyzeDeal` ran). */
  scenario: LoanScenario;
  schedule: AmortizationSchedule;
}

/** The rental charts, inside the Deal Analyzer after its metrics (FR-014). */
export function RentalChartsSection({ scenario, schedule }: RentalChartsSectionProps) {
  const projection = useMemo(() => projectRental(scenario, schedule), [scenario, schedule]);
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-medium text-neutral-700">Over the loan term</h3>
      <div className="grid gap-6">
        <RentalCashFlowChart projection={projection} />
        <EquityBuildUpChart projection={projection} />
        <CashOnCashChart projection={projection} />
      </div>
    </div>
  );
}
