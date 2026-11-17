'use client';

import { useMemo } from 'react';
import {
  compareScenarios,
  computeLtv,
  computeSchedule,
  computeValidSchedules,
  validateScenario,
} from 'shared-calculations';
import { useScenarios } from 'shared-data-access';
import {
  ComparisonGrid,
  CostBreakdownPanel,
  currency,
  LOAN_COMPARISON_COLUMNS,
  LoanInputForm,
  MetricBadge,
  MetricBadgeGroup,
  ScenarioTabs,
} from 'shared-ui';
import { ExportScheduleButton } from './export-schedule-button';
import { ExtraPaymentPanel } from './extra-payment-panel';
import { ScheduleTable } from './schedule-table';

/** The Amortization Calculator page (spec 001), rendered at `/amortization`. */
export function AmortizationCalculatorView() {
  const {
    scenarios,
    activeScenarioId,
    activeScenario,
    setActiveScenarioId,
    updateActiveScenario,
    addScenario,
    removeScenario,
  } = useScenarios();

  const validation = validateScenario(activeScenario);
  const schedule = validation.valid
    ? computeSchedule(validation.scenario)
    : null;
  const ltv = computeLtv(activeScenario);

  const comparison = useMemo(() => {
    const entries = computeValidSchedules(scenarios);
    return entries.length >= 2
      ? compareScenarios(entries.map((e) => e.schedule))
      : null;
  }, [scenarios]);

  const scenarioNames = Object.fromEntries(
    scenarios.map((s) => [s.id, s.name]),
  );

  return (
    <>
      <header>
        <h1
          tabIndex={-1}
          className="text-2xl font-semibold text-neutral-900 focus:outline-none"
        >
          Amortization Calculator
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Model a mortgage payment, its full schedule, real-estate costs, and
          early-payoff savings.
        </p>
      </header>

      {activeScenario.homePrice != null ? (
        <MetricBadgeGroup>
          <MetricBadge label="LTV" value={ltv.value} naReason={ltv.naReason} />
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
          <ScheduleTable periods={schedule.periods} />
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
            columns={LOAN_COMPARISON_COLUMNS}
            scenarioNames={scenarioNames}
          />
        </section>
      ) : null}
    </>
  );
}
