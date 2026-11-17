'use client';

import { useMemo } from 'react';
import { projectRental } from 'deal-analyzer-calculations';
import type { AmortizationSchedule, LoanScenario } from 'shared-calculations';
import { CashOnCashChart } from './cash-on-cash-chart';
import { EquityBuildUpChart } from './equity-build-up-chart';
import { RentalCashFlowChart } from './rental-cash-flow-chart';

export interface RentalChartsSectionProps {
  /** A valid scenario with a valid `rental` (the page only renders this when `analyzeDeal` ran). */
  scenario: LoanScenario;
  schedule: AmortizationSchedule;
}

/** The rental charts, inside the Deal Analyzer after its metrics (spec 005 FR-014). */
export function RentalChartsSection({
  scenario,
  schedule,
}: RentalChartsSectionProps) {
  const projection = useMemo(
    () => projectRental(scenario, schedule),
    [scenario, schedule],
  );
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-medium text-neutral-700">
        Over the loan term
      </h3>
      <div className="grid gap-6">
        <RentalCashFlowChart projection={projection} />
        <EquityBuildUpChart projection={projection} />
        <CashOnCashChart projection={projection} />
      </div>
    </div>
  );
}
