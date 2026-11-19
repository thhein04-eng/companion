'use client';

import { useId, useState } from 'react';
import type { MonthlyAnnual } from 'shared-calculations';
import type { DealAnalysis } from 'deal-analyzer-calculations';
import { Tabs, TabsList, TabsTab } from '@ui-sdk/react/tabs';
import { Ripple, currency } from 'shared-ui';

export type IncomeExpensePeriod = 'monthly' | 'annual';

export interface IncomeExpenseCardProps {
  analysis: DealAnalysis;
  /** Controlled period; falls back to internal state when omitted. */
  period?: IncomeExpensePeriod;
  onPeriodChange?: (period: IncomeExpensePeriod) => void;
}

function Row({
  label,
  amount,
  testId,
  emphasis,
  indent,
}: {
  label: string;
  amount: number;
  testId?: string;
  emphasis?: boolean;
  indent?: boolean;
}) {
  return (
    <div
      data-testid={testId}
      className={`flex items-baseline justify-between py-1 ${emphasis ? 'font-semibold text-fg' : 'text-fg'} ${indent ? 'pl-3 text-sm' : ''}`}
    >
      <span>{label}</span>
      {/* `+ 0` normalizes -0 so a zero expense never renders as "-$0.00". */}
      <span className="num">{currency.format(amount + 0)}</span>
    </div>
  );
}

/**
 * "Rental Income vs. Operating Expenses" breakdown (FR-012). Purely
 * presentational: every figure comes precomputed from `analyzeDeal`.
 */
export function IncomeExpenseCard({
  analysis,
  period,
  onPeriodChange,
}: IncomeExpenseCardProps) {
  const titleId = useId();
  const [internalPeriod, setInternalPeriod] =
    useState<IncomeExpensePeriod>('monthly');
  const current = period ?? internalPeriod;
  const pick = (value: MonthlyAnnual) => value[current];

  const cashFlow = pick(analysis.cashFlow);
  const isNegative = cashFlow < 0;

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-[18px]"
    >
      <div className="flex items-center justify-between">
        <h3 id={titleId} className="font-display text-h3 font-semibold text-fg">
          Rental Income vs. Operating Expenses
        </h3>
        <Tabs
          value={current}
          onValueChange={(next) => {
            if (!next) return;
            setInternalPeriod(next as IncomeExpensePeriod);
            onPeriodChange?.(next as IncomeExpensePeriod);
          }}
        >
          <TabsList
            aria-label="Breakdown period"
            className="flex gap-1 text-xs"
          >
            <TabsTab
              value="monthly"
              className="cursor-pointer rounded-sm border border-transparent px-2 py-0.5 text-muted hover:bg-sunk data-selected:border-ink data-selected:bg-ink data-selected:text-ink-fg"
            >
              Monthly
            </TabsTab>
            <TabsTab
              value="annual"
              className="cursor-pointer rounded-sm border border-transparent px-2 py-0.5 text-muted hover:bg-sunk data-selected:border-ink data-selected:bg-ink data-selected:text-ink-fg"
            >
              Annual
            </TabsTab>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col divide-y divide-line">
        <Row
          label="Gross scheduled income"
          amount={pick(analysis.grossScheduledIncome)}
          testId="row-gsi"
          emphasis
        />
        <div className="py-1">
          {analysis.operatingExpenses.map((line) => (
            <Row
              key={line.category}
              label={line.label}
              amount={-pick(line)}
              testId={`row-${line.category}`}
              indent
            />
          ))}
        </div>
        <Row
          label="Total operating expenses"
          amount={-pick(analysis.totalOperatingExpenses)}
          testId="row-total-opex"
        />
        <Row
          label="Net operating income (NOI)"
          amount={pick(analysis.netOperatingIncome)}
          testId="row-noi"
          emphasis
        />
        <Row
          label="Debt service (P&I + PMI)"
          amount={-pick(analysis.debtService)}
          testId="row-debt-service"
        />
        <div
          data-testid="row-cash-flow"
          className={`flex items-baseline justify-between py-1 font-semibold ${isNegative ? 'text-bad' : 'text-good'}`}
        >
          <span>Pre-tax cash flow</span>
          <span className="flex items-baseline gap-2 num">
            {isNegative ? (
              <span className="rounded bg-bad-soft px-1.5 text-xs font-medium">
                ▼ Negative
              </span>
            ) : null}
            <Ripple value={cashFlow}>{currency.format(cashFlow)}</Ripple>
          </span>
        </div>
      </div>

      {analysis.pmiDropPeriod != null ? (
        <p className="text-xs text-muted">
          Cash flow improves after PMI drops off at payment #
          {analysis.pmiDropPeriod}.
        </p>
      ) : null}
    </section>
  );
}
