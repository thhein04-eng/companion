'use client';

import { useMemo } from 'react';
import {
  compareScenarios,
  computeLtv,
  computeSchedule,
  computeValidSchedules,
  validateScenario,
} from 'shared-calculations';
import {
  analyzeDeal,
  validateRental,
  withDealMetrics,
  type DealAnalysis,
} from 'deal-analyzer-calculations';
import { useScenarios } from 'shared-data-access';
import {
  ComparisonGrid,
  CostBreakdownPanel,
  currency,
  LoanInputForm,
  MetricBadge,
  MetricBadgeGroup,
  ScenarioTabs,
} from 'shared-ui';
import {
  ExportScheduleButton,
  ExtraPaymentPanel,
  ScheduleTable,
} from 'amortization-ui';
import {
  DEAL_COMPARISON_COLUMNS,
  DealMetrics,
  IncomeExpenseCard,
  RentalInputsPanel,
  useRentalEditor,
} from 'deal-analyzer-ui';

export default function Page() {
  const {
    scenarios,
    activeScenarioId,
    activeScenario,
    setActiveScenarioId,
    updateActiveScenario,
    addScenario,
    removeScenario,
  } = useScenarios();
  const { updateActiveRental } = useRentalEditor();

  const validation = validateScenario(activeScenario);
  const schedule = validation.valid ? computeSchedule(validation.scenario) : null;

  // Deal Analyzer (FR-015): rental errors never block the amortization schedule.
  const rentalErrors = activeScenario.rental ? validateRental(activeScenario.rental) : [];
  const analysis =
    validation.valid && schedule && activeScenario.rental && rentalErrors.length === 0
      ? analyzeDeal(validation.scenario, schedule)
      : null;
  const ltv = computeLtv(activeScenario);
  const coc = analysis?.cashOnCashReturn ?? null;

  const comparison = useMemo(() => {
    if (scenarios.length < 2) return null;
    const entries = computeValidSchedules(scenarios);
    if (entries.length < 2) return null;
    const analyses: Record<string, DealAnalysis | null> = {};
    for (const { scenario, schedule: entrySchedule } of entries) {
      const rental = scenario.rental;
      analyses[scenario.id] =
        rental && validateRental(rental).length === 0 ? analyzeDeal(scenario, entrySchedule) : null;
    }
    return withDealMetrics(
      compareScenarios(entries.map((e) => e.schedule)),
      analyses,
    );
  }, [scenarios]);

  const scenarioNames = Object.fromEntries(scenarios.map((s) => [s.id, s.name]));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Real Estate Amortization Calculator
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Model a mortgage payment, its full schedule, real-estate costs, early-payoff savings, and rental cash flow and returns.
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
              tone={coc.value == null ? 'neutral' : coc.value < 0 ? 'negative' : 'positive'}
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
        <h2 className="text-lg font-medium text-neutral-800">Real-estate costs</h2>
        <CostBreakdownPanel
          scenario={activeScenario}
          onChange={updateActiveScenario}
          monthlyPrincipalAndInterest={schedule?.summary.monthlyPrincipalAndInterest ?? 0}
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
            <DealMetrics analysis={analysis} />
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
            Paying extra saves {currency.format(schedule.baselineComparison.interestSaved)} in
            interest and {schedule.baselineComparison.periodsSaved} payments versus the baseline
            schedule.
          </p>
        ) : null}
      </section>

      {schedule ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-neutral-800">Amortization schedule</h2>
            <ExportScheduleButton schedule={schedule} />
          </div>
          <ScheduleTable periods={schedule.periods} />
        </section>
      ) : (
        <p className="text-sm text-red-600">
          Fix the highlighted fields above to see the amortization schedule.
        </p>
      )}

      {comparison ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium text-neutral-800">Compare scenarios</h2>
          <ComparisonGrid
            comparison={comparison}
            columns={DEAL_COMPARISON_COLUMNS}
            scenarioNames={scenarioNames}
          />
        </section>
      ) : null}
    </main>
  );
}
