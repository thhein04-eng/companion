'use client';

import { useMemo } from 'react';
import type { RentalProjection } from 'deal-analyzer-calculations';
import { LineChart, type SeriesDef } from '@companion/charts';
import { ChartNote } from './chart-note';

const percentAxis = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
});
const percent2 = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const SERIES: SeriesDef<'cashOnCash'>[] = [
  { key: 'cashOnCash', label: 'Cash-on-cash', color: 1 },
];

/** Cash-on-cash return per loan year, on the initial cash invested (US6, FR-011). */
export function CashOnCashChart({
  projection,
}: {
  projection: RentalProjection;
}) {
  const data = useMemo(
    () =>
      projection.years.map((y) => ({ x: y.year, cashOnCash: y.cashOnCash })),
    [projection],
  );
  if (projection.cashOnCashNaReason) {
    return (
      <ChartNote
        title="Cash-on-cash return by year"
        message={projection.cashOnCashNaReason}
        data-testid="chart-cash-on-cash-na"
      />
    );
  }
  return (
    <LineChart
      title="Cash-on-cash return by year"
      description="Each year's cash flow divided by your initial cash invested."
      data-testid="chart-cash-on-cash"
      data={data}
      series={SERIES}
      yDomain="auto"
      formatters={{
        x: (year) => `Yr ${year}`,
        y: (v) => percentAxis.format(v),
        tooltipY: (v) => percent2.format(v),
      }}
    />
  );
}
