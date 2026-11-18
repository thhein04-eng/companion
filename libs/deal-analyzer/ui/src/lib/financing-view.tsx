'use client';

import { useMemo } from 'react';
import {
  compareScenarios,
  computeSchedule,
  computeValidSchedules,
  validateScenario,
} from 'shared-calculations';
import {
  analyzeDeal,
  buildFinancingMatrix,
  validateDscrMinimum,
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
  ScenarioTabs,
} from 'shared-ui';
import { FINANCING_COMPARISON_COLUMNS } from './deal-comparison-columns';
import { DscrCard } from './dscr-card';
import { FinancingMatrix } from './financing-matrix';
import { RentalInputsPanel } from './rental-inputs-panel';
import { useFinancingEditor } from './use-financing-editor';
import { useRentalEditor } from './use-rental-editor';

/**
 * The DSCR & Financing page (spec 006), rendered at `/financing`. It shares
 * the scenario store with the other pages, so loan, cost and rental inputs
 * entered anywhere show up here (spec 003 FR-004).
 */
export function FinancingView() {
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
  const { setDscrMinimum, setSelection, patchTerms, resetTerms } =
    useFinancingEditor();

  const { validation, schedule, rentalErrors, analysis, matrix } =
    useMemo(() => {
      const validation = validateScenario(activeScenario);
      const schedule = validation.valid
        ? computeSchedule(validation.scenario)
        : null;
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
      // Matrix errors never block the DSCR card or the inputs (FR-011).
      const matrix =
        validation.valid && analysis
          ? buildFinancingMatrix(validation.scenario, analysis)
          : null;
      return { validation, schedule, rentalErrors, analysis, matrix };
    }, [activeScenario]);

  const comparison = useMemo(() => {
    const entries = computeValidSchedules(scenarios);
    if (entries.length < 2) return null;
    const analyses: Record<string, DealAnalysis | null> = {};
    for (const { scenario, schedule: entrySchedule } of entries) {
      const rental = scenario.rental;
      analyses[scenario.id] =
        rental && validateRental(rental).length === 0
          ? analyzeDeal(scenario, entrySchedule)
          : null;
    }
    return withDealMetrics(
      compareScenarios(entries.map((e) => e.schedule)),
      analyses,
    );
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
          DSCR &amp; Financing
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Check debt service coverage against a lender minimum and compare how
          conventional, ARM and DSCR loans change your cash flow.
        </p>
      </header>

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
        <h2 className="text-lg font-medium text-neutral-800">Rental income</h2>
        <RentalInputsPanel
          rental={activeScenario.rental ?? null}
          errors={rentalErrors}
          onChange={updateActiveRental}
          totalCashInvested={analysis?.totalCashInvested ?? null}
        />
        {!validation.valid ? (
          <p className="text-sm text-red-600">
            Fix the highlighted loan fields above to see the debt coverage.
          </p>
        ) : null}
      </section>

      {analysis ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium text-neutral-800">
            Debt service coverage
          </h2>
          <p className="text-sm text-neutral-500">
            Net operating income{' '}
            <span className="font-medium tabular-nums text-neutral-800">
              {currency.format(analysis.netOperatingIncome.annual)}/yr
            </span>{' '}
            ÷ annual principal &amp; interest of your loan above.
          </p>
          <div className="max-w-md">
            <DscrCard
              dscr={analysis.dscr}
              onMinimumChange={setDscrMinimum}
              minimumInput={activeScenario.rental?.dscrMinimum}
              minimumError={
                validateDscrMinimum(activeScenario.rental)[0]?.message ?? null
              }
            />
          </div>
        </section>
      ) : null}

      {matrix && analysis ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium text-neutral-800">
            Financing options
          </h2>
          <FinancingMatrix
            matrix={matrix}
            scenarioName={activeScenario.name}
            noiMonthly={analysis.netOperatingIncome.monthly}
            errors={matrix.options?.flatMap((o) => o.errors) ?? []}
            onSelect={setSelection}
            onTermsChange={patchTerms}
            onReset={resetTerms}
          />
        </section>
      ) : null}

      {comparison ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium text-neutral-800">
            Compare scenarios
          </h2>
          <ComparisonGrid
            comparison={comparison}
            columns={FINANCING_COMPARISON_COLUMNS}
            scenarioNames={scenarioNames}
          />
        </section>
      ) : null}
    </>
  );
}
