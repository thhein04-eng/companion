'use client';

import { useMemo } from 'react';
import { buildYearlyPrincipalInterest, type AmortizationSchedule } from 'amortization-calculations';
import { formatCompactCurrency, StackedBarChart, type SeriesDef } from '@companion/charts';
import { formatUsd } from './format';

type Key = 'principal' | 'extraPrincipal' | 'interest';

export interface PrincipalInterestChartProps {
  schedule: AmortizationSchedule;
  groupBy?: 'loanYear' | 'calendarYear';
}

/** Principal, extra principal and interest per year as stacked columns (US2, FR-002). */
export function PrincipalInterestChart({ schedule, groupBy = 'loanYear' }: PrincipalInterestChartProps) {
  const rows = useMemo(() => buildYearlyPrincipalInterest(schedule, { groupBy }), [schedule, groupBy]);
  const hasExtra = rows.some((r) => r.extraPrincipal > 0);
  const series = useMemo<SeriesDef<Key>[]>(
    () => [
      { key: 'principal', label: 'Principal', color: 1 },
      ...(hasExtra ? [{ key: 'extraPrincipal' as const, label: 'Extra principal', color: 3 as const }] : []),
      { key: 'interest', label: 'Interest', color: 2 },
    ],
    [hasExtra]
  );

  return (
    <StackedBarChart
      title="Principal vs. interest by year"
      data-testid="chart-principal-interest"
      data={rows}
      series={series}
      formatters={{ y: formatCompactCurrency, tooltipY: formatUsd }}
    />
  );
}
