'use client';

import { useMemo } from 'react';
import { buildScenarioBalanceComparison, type AmortizationSchedule, type LoanScenario } from 'amortization-calculations';
import { formatCompactCurrency, LineChart, type Datum, type SeriesDef, type SeriesSlot } from '@companion/charts';
import { formatUsd } from './format';

/** The palette has 8 fixed slots, one per scenario-list position. */
const MAX_POSITIONS = 8;

export interface ScenarioBalanceChartProps {
  /** Schedules of the valid scenarios (any order). */
  schedules: AmortizationSchedule[];
  /** The full scenario list, in display order. Its order decides each line's color. */
  scenarios: Pick<LoanScenario, 'id' | 'name'>[];
}

/**
 * Remaining balance of every valid scenario on one chart (US4, FR-004). A scenario's color is its
 * position in the scenario list, so it doesn't change when other scenarios are added, removed or
 * become invalid. Only valid scenarios in the first 8 positions are drawn.
 */
export function ScenarioBalanceChart({ schedules, scenarios }: ScenarioBalanceChartProps) {
  const { data, series, hiddenCount } = useMemo(() => {
    const byId = new Map(schedules.map((s) => [s.scenarioId, s]));
    const drawable: SeriesDef[] = [];
    let hidden = 0;
    scenarios.forEach((scenario, index) => {
      if (!byId.has(scenario.id)) return;
      if (index >= MAX_POSITIONS) {
        hidden += 1;
        return;
      }
      drawable.push({ key: scenario.id, label: scenario.name, color: (index + 1) as SeriesSlot });
    });
    const shownSchedules = drawable.map((s) => byId.get(s.key) as AmortizationSchedule);
    return {
      data: buildScenarioBalanceComparison(shownSchedules) as Datum[],
      series: drawable,
      hiddenCount: hidden,
    };
  }, [schedules, scenarios]);

  if (series.length < 2) return null;

  const lastPeriod = data.length - 1;
  const xTickValues: number[] = [];
  for (let p = 0; p <= lastPeriod; p += 60) xTickValues.push(p);

  return (
    <LineChart
      title="Balance by scenario"
      description={
        hiddenCount > 0 ? `Showing scenarios in the first 8 positions; ${hiddenCount} more not drawn.` : undefined
      }
      data-testid="chart-scenario-balance"
      data={data}
      series={series}
      xTickValues={xTickValues}
      formatters={{
        x: (n) => (n === 0 ? 'Start' : `Yr ${n / 12}`),
        tooltipX: (n) => (n === 0 ? 'Start' : `Month ${n} · Year ${Math.ceil(n / 12)}`),
        y: formatCompactCurrency,
        tooltipY: formatUsd,
      }}
    />
  );
}
