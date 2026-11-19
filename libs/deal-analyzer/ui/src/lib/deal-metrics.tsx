import type { DealAnalysis } from 'deal-analyzer-calculations';
import { Ripple, currency, percent1, percent2 } from 'shared-ui';
import { RuleIndicator } from './rule-indicator';

export interface DealMetricsProps {
  analysis: DealAnalysis;
}

/** Cap rate plus the 1% and 50% rules of thumb (spec 002 User Story 3). */
export function DealMetrics({ analysis }: DealMetricsProps) {
  return (
    <div
      data-testid="deal-metrics"
      className="grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-2"
    >
      <div
        data-testid="cap-rate"
        className="flex flex-col gap-1 rounded-lg border border-line bg-surface px-3.5 py-3"
      >
        <span className="text-sm font-medium text-fg">Cap rate</span>
        <span className="num font-display text-[20px] font-semibold">
          <Ripple value={analysis.capRate.value}>
            {analysis.capRate.value != null
              ? percent2.format(analysis.capRate.value)
              : 'N/A'}
          </Ripple>
        </span>
        <span className="text-xs text-muted">
          {analysis.capRate.naReason ?? 'Independent of financing'}
        </span>
      </div>
      <RuleIndicator
        name="1% Rule"
        status={
          analysis.onePercentRule
            ? analysis.onePercentRule.pass
              ? 'pass'
              : 'fail'
            : 'na'
        }
        detail={
          analysis.onePercentRule
            ? `Rent ${currency.format(analysis.onePercentRule.actualRent)} vs. target ${currency.format(analysis.onePercentRule.targetRent)}`
            : 'Enter a purchase price to check the 1% Rule.'
        }
        explanation="Monthly rent should be at least 1% of the purchase price."
      />
      <RuleIndicator
        name="50% Rule"
        status={
          analysis.fiftyPercentRule
            ? analysis.fiftyPercentRule.withinRule
              ? 'pass'
              : 'fail'
            : 'na'
        }
        detail={
          analysis.fiftyPercentRule
            ? `Expenses ${percent1.format(analysis.fiftyPercentRule.opexRatio)} of income · Rule estimate ${currency.format(analysis.fiftyPercentRule.estimatedMonthlyCashFlow)}/mo`
            : 'Enter rent greater than $0 to check the 50% Rule.'
        }
        explanation="Operating expenses (excluding the mortgage) typically run about 50% of gross rent."
      />
    </div>
  );
}
