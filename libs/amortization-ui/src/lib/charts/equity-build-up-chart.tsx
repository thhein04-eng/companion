'use client';

import { useMemo } from 'react';
import type { RentalProjection } from 'amortization-calculations';
import { formatCompactCurrency, StackedBarChart, type SeriesDef } from '@companion/charts';
import { ChartNote } from './chart-note';
import { formatUsd } from './format';

type Key = 'initialEquity' | 'principalPaid' | 'appreciation';

/**
 * Equity per loan year, split into initial equity (price − loan), principal paid down and
 * appreciation (US6, FR-011). Home value and loan balance appear in the tooltip and table.
 */
export function EquityBuildUpChart({ projection }: { projection: RentalProjection }) {
  const { years, equityNaReason } = projection;
  const data = useMemo(
    () =>
      years.map((y) => ({
        x: y.x,
        initialEquity: y.initialEquity,
        principalPaid: y.principalPaid,
        appreciation: y.appreciation,
      })),
    [years]
  );
  const hasAppreciation = years.some((y) => (y.appreciation ?? 0) !== 0);
  const series = useMemo<SeriesDef<Key>[]>(
    () => [
      { key: 'initialEquity', label: 'Initial equity', color: 1 },
      { key: 'principalPaid', label: 'Principal paid', color: 3 },
      ...(hasAppreciation ? [{ key: 'appreciation' as const, label: 'Appreciation', color: 4 as const }] : []),
    ],
    [hasAppreciation]
  );

  if (equityNaReason) {
    return <ChartNote title="Equity build-up" message={equityNaReason} data-testid="chart-equity-na" />;
  }
  return (
    <StackedBarChart
      title="Equity build-up"
      data-testid="chart-equity"
      data={data}
      series={series}
      formatters={{ y: formatCompactCurrency, tooltipY: formatUsd }}
      tooltipExtras={(i) => [
        { label: 'Home value', value: formatUsd(years[i]?.homeValue ?? 0) },
        { label: 'Loan balance', value: formatUsd(years[i]?.loanBalance ?? 0) },
      ]}
    />
  );
}
