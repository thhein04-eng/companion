import { onePercentRatio, type DealAnalysis } from 'deal-analyzer-calculations';
import { currency, percent1, percent2 } from 'shared-ui';
import { MetricCard } from './metric-card';

export interface DealMetricsProps {
  analysis: DealAnalysis;
}

/**
 * Cap rate plus the 1% and 50% rules of thumb (spec 002 User Story 3), as three cards of one
 * design in an even row (spec 011 US3).
 */
export function DealMetrics({ analysis }: DealMetricsProps) {
  const { capRate, onePercentRule: one, fiftyPercentRule: fifty } = analysis;
  const oneRatio = one ? onePercentRatio(one) : null;
  return (
    <div
      data-testid="deal-metrics"
      className="grid grid-cols-1 items-stretch gap-[var(--space-grid)] sm:grid-cols-3"
    >
      <MetricCard
        data-testid="cap-rate"
        label="Cap rate"
        info="Net operating income per year ÷ purchase price, before financing."
        value={capRate.value != null ? percent2.format(capRate.value) : 'N/A'}
        rippleValue={capRate.value}
        status={capRate.value != null ? 'info' : 'na'}
        explanation={capRate.naReason ?? 'Independent of financing'}
      />
      <MetricCard
        data-testid="rule-1-rule"
        label="1% Rule"
        info="Monthly rent should be at least 1% of the purchase price."
        value={oneRatio != null ? percent2.format(oneRatio) : 'N/A'}
        rippleValue={oneRatio}
        status={one ? (one.pass ? 'pass' : 'fail') : 'na'}
        explanation={
          one
            ? `Rent ${currency.format(one.actualRent)} vs. target ${currency.format(one.targetRent)}`
            : 'Enter a purchase price to check the 1% Rule.'
        }
      />
      <MetricCard
        data-testid="rule-50-rule"
        label="50% Rule"
        info="Operating expenses (excluding the mortgage) typically run about 50% of gross rent."
        value={fifty ? percent1.format(fifty.opexRatio) : 'N/A'}
        rippleValue={fifty?.opexRatio ?? null}
        status={fifty ? (fifty.withinRule ? 'pass' : 'fail') : 'na'}
        explanation={
          fifty
            ? `Expenses vs. the 50% guideline · Rule estimate ${currency.format(fifty.estimatedMonthlyCashFlow)}/mo`
            : 'Enter rent greater than $0 to check the 50% Rule.'
        }
      />
    </div>
  );
}
