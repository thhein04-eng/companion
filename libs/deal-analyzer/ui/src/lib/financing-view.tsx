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
  currency,
  dealPayment,
  DealStrip,
  FINANCING_PROFILE,
  InputsMessage,
  OccupancyViewSwitch,
  PageHeader,
  Section,
  SectionHeader,
} from 'shared-ui';
import { FINANCING_COMPARISON_COLUMNS } from './deal-comparison-columns';
import { DscrCard } from './dscr-card';
import { formatDscr } from './format-dscr';
import { FinancingMatrix } from './financing-matrix';
import { useFinancingEditor } from './use-financing-editor';

/**
 * The DSCR & Financing page (spec 006), rendered at `/financing`. It shares
 * the scenario store with the other pages, so loan, cost and rental inputs
 * entered anywhere show up here (spec 003 FR-004).
 */
export function FinancingView() {
  const { scenarios, activeScenario } = useScenarios();
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

  const payment = dealPayment(activeScenario, schedule);
  const errors = [
    ...(validation.valid ? [] : validation.errors),
    ...rentalErrors,
  ];

  return (
    <>
      <DealStrip
        profile={FINANCING_PROFILE}
        headline={{
          label: 'DSCR',
          value: analysis?.dscr.value ?? null,
          naReason: !validation.valid
            ? 'Fix the loan inputs to see DSCR.'
            : activeScenario.rental
              ? (analysis?.dscr.naReason ??
                'Fix the rental inputs to see DSCR.')
              : 'Add rent to see DSCR.',
          format: formatDscr,
          betterWhen: 'higher',
        }}
        errors={errors}
        payment={payment}
        sheet={{ totalCashInvested: analysis?.totalCashInvested ?? null }}
      />
      <PageHeader
        eyebrow="Analysis"
        title="DSCR & Financing"
        lede="Check debt service coverage against a lender minimum and compare how conventional, ARM and DSCR loans change your cash flow."
      />

      {!analysis ? (
        <InputsMessage
          data-testid="financing-na"
          errors={errors}
          message={
            !validation.valid
              ? 'Fix the loan inputs to see the debt coverage.'
              : activeScenario.rental
                ? 'Fix the rental inputs to see the debt coverage.'
                : 'Add rent to see the debt coverage.'
          }
        />
      ) : null}

      {analysis ? (
        <Section>
          <SectionHeader
            title="Debt service coverage"
            lede={
              <>
                Net operating income{' '}
                <b className="num font-semibold text-fg">
                  {currency.format(analysis.netOperatingIncome.annual)}/yr
                </b>{' '}
                ÷ annual principal &amp; interest of this deal&apos;s loan.
              </>
            }
          />
          <OccupancyViewSwitch showLabel />
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
        </Section>
      ) : null}

      {matrix && analysis ? (
        <Section>
          <SectionHeader title="Financing options" />
          <FinancingMatrix
            matrix={matrix}
            scenarioName={activeScenario.name}
            noiMonthly={analysis.netOperatingIncome.monthly}
            errors={matrix.options?.flatMap((o) => o.errors) ?? []}
            onSelect={setSelection}
            onTermsChange={patchTerms}
            onReset={resetTerms}
          />
        </Section>
      ) : null}

      {comparison ? (
        <Section>
          <SectionHeader title="Compare scenarios" />
          <ComparisonGrid
            comparison={comparison}
            columns={FINANCING_COMPARISON_COLUMNS}
            scenarioNames={scenarioNames}
          />
        </Section>
      ) : null}
    </>
  );
}
