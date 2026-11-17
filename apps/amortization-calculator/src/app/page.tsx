'use client';

import { useMemo, useState } from 'react';
import {
  analyzeDeal,
  compareScenarios,
  computeLtv,
  computeSchedule,
  validateRental,
  validateScenario,
} from 'amortization-calculations';
import {
  ComparisonGrid,
  DEFAULT_SCHEDULE_PAGE_SIZE,
  IncomeExpenseCard,
  MetricBadge,
  MetricBadgeGroup,
  RuleIndicator,
  ScenarioTabs,
  ScheduleTable,
  type SchedulePaginationState,
} from 'amortization-ui';
import { useScenarios } from './_hooks/use-scenarios';
import { LoanInputForm } from './_components/loan-input-form';
import { CostBreakdownPanel } from './_components/cost-breakdown-panel';
import { ExtraPaymentPanel } from './_components/extra-payment-panel';
import { ExportScheduleButton } from './_components/export-schedule-button';
import { RentalInputsPanel } from './_components/rental-inputs-panel';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
const percent1 = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const percent2 = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function Page() {
  const {
    scenarios,
    activeScenarioId,
    activeScenario,
    setActiveScenarioId,
    updateActiveScenario,
    updateActiveRental,
    addScenario,
    removeScenario,
  } = useScenarios();

  // 004 FR-005: schedule paging lives here, outside the `schedule ? … : …`
  // branch, so it survives the table unmounting while inputs are invalid.
  const [schedulePagination, setSchedulePagination] =
    useState<SchedulePaginationState>({
      page: 1,
      pageSize: DEFAULT_SCHEDULE_PAGE_SIZE,
    });
  // A different scenario starts on page 1 and keeps the page size
  // (adjusting state during render rather than in an effect).
  const [paginationScenarioId, setPaginationScenarioId] =
    useState(activeScenarioId);
  if (paginationScenarioId !== activeScenarioId) {
    setPaginationScenarioId(activeScenarioId);
    setSchedulePagination((current) => ({ ...current, page: 1 }));
  }

  // Memoized on the scenario so paging (004), which re-renders this page,
  // doesn't recompute the schedule or the deal analysis.
  const { validation, schedule, rentalErrors, analysis } = useMemo(() => {
    const validation = validateScenario(activeScenario);
    const schedule = validation.valid
      ? computeSchedule(validation.scenario)
      : null;

    // Deal Analyzer (FR-015): rental errors never block the amortization schedule.
    const rentalErrors = activeScenario.rental
      ? validateRental(activeScenario.rental)
      : [];
    const analysis =
      validation.valid &&
      schedule &&
      activeScenario.rental &&
      rentalErrors.length === 0
        ? analyzeDeal(validation.scenario, schedule)
        : null;
    return { validation, schedule, rentalErrors, analysis };
  }, [activeScenario]);
  const ltv = computeLtv(activeScenario);
  const coc = analysis?.cashOnCashReturn ?? null;

  const comparison = useMemo(() => {
    if (scenarios.length < 2) return null;
    const schedules: ReturnType<typeof computeSchedule>[] = [];
    const analyses: Record<string, ReturnType<typeof analyzeDeal> | null> = {};
    for (const scenario of scenarios) {
      const result = validateScenario(scenario);
      if (!result.valid) continue;
      const scenarioSchedule = computeSchedule(result.scenario);
      schedules.push(scenarioSchedule);
      const rental = result.scenario.rental;
      analyses[scenario.id] =
        rental && validateRental(rental).length === 0
          ? analyzeDeal(result.scenario, scenarioSchedule)
          : null;
    }
    return schedules.length >= 2 ? compareScenarios(schedules, analyses) : null;
  }, [scenarios]);

  const scenarioNames = Object.fromEntries(
    scenarios.map((s) => [s.id, s.name]),
  );

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Real Estate Amortization Calculator
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Model a mortgage payment, its full schedule, real-estate costs,
          early-payoff savings, and rental cash flow and returns.
        </p>
      </header>

      {activeScenario.homePrice != null || analysis ? (
        <MetricBadgeGroup>
          <MetricBadge label="LTV" value={ltv.value} naReason={ltv.naReason} />
          {coc ? (
            <MetricBadge
              label="Cash-on-Cash"
              value={coc.value}
              naReason={coc.naReason}
              tone={
                coc.value == null
                  ? 'neutral'
                  : coc.value < 0
                    ? 'negative'
                    : 'positive'
              }
            />
          ) : null}
        </MetricBadgeGroup>
      ) : null}

      <ScenarioTabs
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        onActiveScenarioIdChange={setActiveScenarioId}
        onAddScenario={addScenario}
        onRemoveScenario={removeScenario}
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-neutral-800">Loan</h2>
        <LoanInputForm
          scenario={activeScenario}
          errors={validation.valid ? [] : validation.errors}
          onChange={updateActiveScenario}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-neutral-800">
          Real-estate costs
        </h2>
        <CostBreakdownPanel
          scenario={activeScenario}
          onChange={updateActiveScenario}
          monthlyPrincipalAndInterest={
            schedule?.summary.monthlyPrincipalAndInterest ?? 0
          }
          totalMonthlyPayment={schedule?.summary.totalMonthlyPayment ?? 0}
          pmiDropPeriod={schedule?.summary.pmiDropPeriod ?? null}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-neutral-800">Deal analyzer</h2>
        <RentalInputsPanel
          rental={activeScenario.rental ?? null}
          errors={rentalErrors}
          onChange={updateActiveRental}
          totalCashInvested={analysis?.totalCashInvested ?? null}
        />
        {analysis ? (
          <>
            <IncomeExpenseCard analysis={analysis} />
            <div
              data-testid="deal-metrics"
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              <div
                data-testid="cap-rate"
                className="flex flex-col gap-1 rounded-md border border-neutral-200 bg-white p-3"
              >
                <span className="text-sm font-medium text-neutral-900">
                  Cap rate
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {analysis.capRate.value != null
                    ? percent2.format(analysis.capRate.value)
                    : 'N/A'}
                </span>
                <span className="text-xs text-neutral-500">
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
                    : 'Enter rent above $0 to check the 50% Rule.'
                }
                explanation="Operating expenses (excluding the mortgage) typically run about 50% of gross rent."
              />
            </div>
          </>
        ) : null}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-neutral-800">Extra payments</h2>
        <ExtraPaymentPanel
          extraPayments={activeScenario.extraPayments}
          onChange={(extraPayments) => updateActiveScenario({ extraPayments })}
        />
        {schedule?.baselineComparison ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Paying extra saves{' '}
            {currency.format(schedule.baselineComparison.interestSaved)} in
            interest and {schedule.baselineComparison.periodsSaved} payments
            versus the baseline schedule.
          </p>
        ) : null}
      </section>

      {schedule ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-neutral-800">
              Amortization schedule
            </h2>
            <ExportScheduleButton schedule={schedule} />
          </div>
          <ScheduleTable
            periods={schedule.periods}
            pagination={schedulePagination}
            onPaginationChange={setSchedulePagination}
          />
        </section>
      ) : (
        <p className="text-sm text-red-600">
          Fix the highlighted fields above to see the amortization schedule.
        </p>
      )}

      {comparison ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium text-neutral-800">
            Compare scenarios
          </h2>
          <ComparisonGrid
            comparison={comparison}
            scenarioNames={scenarioNames}
          />
        </section>
      ) : null}
    </main>
  );
}
