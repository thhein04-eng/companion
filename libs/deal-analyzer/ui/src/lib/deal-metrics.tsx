import type { DealAnalysis } from 'deal-analyzer-calculations';
import { currency, percent1, percent2 } from 'shared-ui';
import { DscrCard } from './dscr-card';
import { RuleIndicator } from './rule-indicator';

export interface DealMetricsProps {
  analysis: DealAnalysis;
  /** Writes `rental.dscrMinimum` (spec 006). */
  onDscrMinimumChange?: (value: number) => void;
  dscrMinimumInput?: number;
  dscrMinimumError?: string | null;
}

/** Cap rate, DSCR, and the 1% and 50% rules of thumb (spec 002 User Story 3, spec 006 US1). */
export function DealMetrics({
  analysis,
  onDscrMinimumChange = () => undefined,
  dscrMinimumInput,
  dscrMinimumError = null,
}: DealMetricsProps) {
  return (
    <div
      data-testid="deal-metrics"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div
        data-testid="cap-rate"
        className="flex flex-col gap-1 rounded-md border border-neutral-200 bg-white p-3"
      >
        <span className="text-sm font-medium text-neutral-900">Cap rate</span>
        <span className="text-lg font-semibold tabular-nums">
          {analysis.capRate.value != null
            ? percent2.format(analysis.capRate.value)
            : 'N/A'}
        </span>
        <span className="text-xs text-neutral-500">
          {analysis.capRate.naReason ?? 'Independent of financing'}
        </span>
      </div>
      <DscrCard
        dscr={analysis.dscr}
        onMinimumChange={onDscrMinimumChange}
        minimumInput={dscrMinimumInput}
        minimumError={dscrMinimumError}
      />
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
            : 'Enter rent above $0 to check the 50% Rule.'
        }
        explanation="Operating expenses (excluding the mortgage) typically run about 50% of gross rent."
      />
    </div>
  );
}
