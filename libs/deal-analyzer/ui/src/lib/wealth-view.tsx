'use client';

import { useMemo } from 'react';
import { computeSchedule, validateScenario } from 'shared-calculations';
import {
  projectWealth,
  validateRental,
  validateWealth,
  type WealthProjection,
  type WealthYear,
} from 'deal-analyzer-calculations';
import { useScenarios } from 'shared-data-access';
import { CostBreakdownPanel, LoanInputForm, ScenarioTabs } from 'shared-ui';
import { NetWorthChart } from './net-worth-chart';
import { RentalInputsPanel } from './rental-inputs-panel';
import { useRentalEditor } from './use-rental-editor';
import { useWealthEditor } from './use-wealth-editor';
import { WealthAssumptionsPanel } from './wealth-assumptions-panel';
import { WealthSummary } from './wealth-summary';
import { WealthTable } from './wealth-table';

const sectionHeading = 'text-lg font-medium text-neutral-800';

/**
 * The Wealth Projection page (spec 008), rendered at `/wealth`. Shares the
 * scenario store with the other pages (spec 003 FR-004).
 */
export function WealthView() {
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
  const { setWealth, setGrowth, applyTypicalRates } = useWealthEditor();
  const rental = activeScenario.rental ?? null;

  const { validation, schedule, rentalErrors, projection, naMessage } =
    useMemo(() => {
      const validation = validateScenario(activeScenario);
      const schedule = validation.valid
        ? computeSchedule(validation.scenario)
        : null;
      const rental = activeScenario.rental ?? null;
      const rentalErrors = rental ? validateRental(rental) : [];
      // Spec 008 FR-014: the first reason that applies, so the section never goes blank.
      let naMessage: string | null = null;
      let projection: WealthProjection | null = null;
      if (!rental) {
        naMessage = 'Enter rent above to project net worth.';
      } else if (rentalErrors.length > 0) {
        naMessage = 'Fix the highlighted rental inputs to see the projection.';
      } else if (!validation.valid || !schedule) {
        naMessage = 'Fix the highlighted loan fields above to see the projection.';
      } else {
        projection = projectWealth(validation.scenario, schedule);
        naMessage = projection.naReason;
      }
      return { validation, schedule, rentalErrors, projection, naMessage };
    }, [activeScenario]);

  const ready =
    projection?.years != null
      ? (projection as WealthProjection & { years: WealthYear[] })
      : null;

  return (
    <>
      <header>
        <h1
          tabIndex={-1}
          className="text-2xl font-semibold text-neutral-900 focus:outline-none"
        >
          Wealth Projection
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Project equity, cash flow and net worth over time.
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Simplified model, not tax advice.
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
        <h2 className={sectionHeading}>Loan</h2>
        <LoanInputForm
          scenario={activeScenario}
          errors={validation.valid ? [] : validation.errors}
          onChange={updateActiveScenario}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className={sectionHeading}>Real-estate costs</h2>
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
        <h2 className={sectionHeading}>Rental income</h2>
        <RentalInputsPanel
          rental={rental}
          errors={rentalErrors}
          onChange={updateActiveRental}
          hideGrowth
        />
      </section>

      {rental ? (
        <section className="flex flex-col gap-4">
          <h2 className={sectionHeading}>Projection assumptions</h2>
          <WealthAssumptionsPanel
            rental={rental}
            errors={[...validateWealth(rental), ...rentalErrors]}
            onWealthChange={setWealth}
            onGrowthChange={setGrowth}
            onTypicalRates={applyTypicalRates}
          />
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className={sectionHeading}>Net worth over time</h2>
        {ready ? (
          <>
            <WealthSummary projection={ready} />
            <NetWorthChart projection={ready} />
          </>
        ) : (
          <p data-testid="wealth-na" className="text-sm text-neutral-500">
            {naMessage}
          </p>
        )}
      </section>

      {ready ? (
        <section className="flex flex-col gap-4">
          <h2 className={sectionHeading}>Year by year</h2>
          <WealthTable
            projection={ready}
            hasExtraPayments={activeScenario.extraPayments.length > 0}
          />
        </section>
      ) : null}
    </>
  );
}
