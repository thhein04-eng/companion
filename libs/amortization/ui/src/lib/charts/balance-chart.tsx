'use client';

import { useMemo } from 'react';
import { buildBalanceSeries } from 'amortization-calculations';
import type { AmortizationSchedule } from 'shared-calculations';
import {
  formatCompactCurrency,
  LineChart,
  type SeriesDef,
} from '@companion/charts';
import { formatMonthYear, formatUsd, formatYear, yearTicks } from './format';

export interface BalanceChartProps {
  schedule: AmortizationSchedule;
  /** The no-extra-payment schedule (`computeBaselineSchedule`); omit or `null` when there are no extras. */
  baseline?: AmortizationSchedule | null;
}

/** Remaining balance over time, with a muted baseline when extra payments exist (US1, FR-001). */
export function BalanceChart({ schedule, baseline = null }: BalanceChartProps) {
  const data = useMemo(
    () => buildBalanceSeries(schedule, baseline),
    [schedule, baseline],
  );
  const series = useMemo<SeriesDef<'balance' | 'baseline'>[]>(
    () =>
      baseline
        ? [
            { key: 'balance', label: 'With extra payments', color: 1 },
            {
              key: 'baseline',
              label: 'Baseline',
              color: 'muted',
              emphasis: 'context',
            },
          ]
        : [{ key: 'balance', label: 'Balance', color: 1 }],
    [baseline],
  );
  const lastPeriod = data.length - 1;
  const xTickValues = useMemo(() => yearTicks(lastPeriod), [lastPeriod]);

  return (
    <LineChart
      title="Remaining balance"
      data-testid="chart-balance"
      data={data}
      series={series}
      xTickValues={xTickValues}
      formatters={{
        x: (n) => formatYear(data[n]?.date ?? ''),
        tooltipX: (n) =>
          n === 0 ? 'Start' : formatMonthYear(data[n]?.date ?? ''),
        y: formatCompactCurrency,
        tooltipY: formatUsd,
      }}
    />
  );
}
