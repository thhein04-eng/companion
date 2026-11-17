'use client';

import { useMemo } from 'react';
import type { RentalProjection } from 'deal-analyzer-calculations';
import {
  formatCompactCurrency,
  LineChart,
  type SeriesDef,
} from '@companion/charts';
import { currency } from 'shared-ui';

const formatUsd = (value: number) => currency.format(value);

type Key = 'noi' | 'debtService' | 'cashFlow';

const SERIES: SeriesDef<Key>[] = [
  { key: 'noi', label: 'NOI', color: 1 },
  { key: 'debtService', label: 'Debt service', color: 2 },
  { key: 'cashFlow', label: 'Cash flow', color: 3 },
];

/**
 * Yearly NOI, debt service and cash flow over the loan term (US6, FR-011). Cash flow is the gap
 * between the other two; it steps up when PMI drops off and when the loan is paid off.
 */
export function RentalCashFlowChart({
  projection,
}: {
  projection: RentalProjection;
}) {
  const data = useMemo(
    () =>
      projection.years.map((y) => ({
        x: y.year,
        noi: y.noi,
        debtService: y.debtService,
        cashFlow: y.cashFlow,
      })),
    [projection],
  );
  return (
    <LineChart
      title="Cash flow over the loan term"
      description="Yearly net operating income, mortgage payments (P&I + PMI) and what's left."
      data-testid="chart-rental-cash-flow"
      data={data}
      series={SERIES}
      yDomain="auto"
      formatters={{
        x: (year) => `Yr ${year}`,
        y: formatCompactCurrency,
        tooltipY: formatUsd,
      }}
    />
  );
}
