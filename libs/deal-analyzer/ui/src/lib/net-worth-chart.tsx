'use client';

import { useMemo } from 'react';
import type { WealthProjection, WealthYear } from 'deal-analyzer-calculations';
import {
  formatCompactCurrency,
  LineChart,
  type SeriesDef,
} from '@companion/charts';
import { currency } from 'shared-ui';

type Key = 'netWorth' | 'equity' | 'netWorthAfterTax';

const usd = (value: number) => currency.format(value);

/** Year ticks: every year up to 10, otherwise every 5 plus the last year. */
function ticks(lastYear: number): number[] {
  if (lastYear <= 10) return Array.from({ length: lastYear + 1 }, (_, i) => i);
  const out: number[] = [];
  for (let y = 0; y <= lastYear; y += 5) out.push(y);
  if (out[out.length - 1] !== lastYear) out.push(lastYear);
  return out;
}

/**
 * Net worth (equity + cumulative cash flow), equity and after-tax net worth
 * from purchase to the horizon (spec 008 FR-010).
 */
export function NetWorthChart({
  projection,
}: {
  projection: WealthProjection & { years: WealthYear[] };
}) {
  const { years, taxNaReason } = projection;
  const data = useMemo(
    () =>
      years.map((y) => ({
        x: y.year,
        netWorth: y.netWorth,
        equity: y.equity,
        netWorthAfterTax: y.netWorthAfterTax,
      })),
    [years],
  );
  const series = useMemo<SeriesDef<Key>[]>(
    () => [
      { key: 'netWorth', label: 'Net worth', color: 1 },
      { key: 'equity', label: 'Equity', color: 3 },
      ...(taxNaReason == null
        ? [
            {
              key: 'netWorthAfterTax' as const,
              label: 'Net worth after tax',
              color: 4 as const,
            },
          ]
        : []),
    ],
    [taxNaReason],
  );
  const lastYear = years[years.length - 1].year;
  const xTickValues = useMemo(() => ticks(lastYear), [lastYear]);

  return (
    <LineChart
      title="Net worth over time"
      description="Equity + cumulative cash flow"
      data-testid="chart-net-worth"
      data={data}
      series={series}
      xTickValues={xTickValues}
      formatters={{
        x: (n) => (n === 0 ? 'Purchase' : `Yr ${n}`),
        tooltipX: (n) => (n === 0 ? 'Purchase' : `Year ${n}`),
        y: formatCompactCurrency,
        tooltipY: usd,
      }}
      tooltipExtras={(i) => {
        const y = years[i];
        return [
          { label: 'Property value', value: usd(y.propertyValue) },
          { label: 'Loan balance', value: usd(y.loanBalance) },
          { label: 'Cumulative cash flow', value: usd(y.cumulativeCashFlow) },
          {
            label: 'Cumulative tax effect',
            value:
              y.cumulativeTaxEffect == null ? '—' : usd(y.cumulativeTaxEffect),
          },
        ];
      }}
    />
  );
}
