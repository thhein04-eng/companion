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
import { useDealEdits, useScenarios } from 'shared-data-access';
import {
  ComparisonGrid,
  currency,
  DEAL_ANALYZER_PROFILE,
  dealPayment,
  DealStrip,
  GrowthFields,
  InputsMessage,
  MetricBadge,
  MetricBadgeGroup,
  PageHeader,
  Section,
  SectionHeader,
} from 'shared-ui';
import { RentalChartsSection } from './charts/rental-charts-section';
import { DEAL_COMPARISON_COLUMNS } from './deal-comparison-columns';
import { DealMetrics } from './deal-metrics';
import { IncomeExpenseCard } from './income-expense-card';

/** The Rental Deal Analyzer page (spec 002), rendered at `/deal-analyzer`. */
export function DealAnalyzerView() {
  const { scenarios, activeScenario } = useScenarios();
  const { editRental } = useDealEdits();

  // Memoized on the scenario so unrelated re-renders don't recompute the
  // schedule or the deal analysis.
  const { validation, schedule, rentalErrors, analysis } = useMemo(() => {
    const validation = validateScenario(activeScenario);
    const schedule = validation.valid
      ? computeSchedule(validation.scenario)
      : null;

    // Spec 002 FR-015: rental errors never block the loan figures.
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
        profile={DEAL_ANALYZER_PROFILE}
        headline={{
          label: 'Cash flow',
          value: analysis?.cashFlow.monthly ?? null,
          naReason: !validation.valid
            ? 'Fix the loan inputs to see cash flow.'
            : activeScenario.rental
              ? 'Fix the rental inputs to see cash flow.'
              : 'Add rent to see cash flow.',
          format: (n) => `${currency.format(n)}/mo`,
          betterWhen: 'higher',
        }}
        errors={errors}
        payment={payment}
        sheet={{ totalCashInvested: analysis?.totalCashInvested ?? null }}
      />
      <PageHeader
        eyebrow="Analysis"
        title="Rental Deal Analyzer"
        lede="Analyze a rental's cash flow, returns, and rules of thumb."
      />

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

      <Section>
        <SectionHeader
          title="Deal analyzer"
          lede="Income, expenses, returns and rules of thumb for this deal."
        />
        {analysis ? (
          <>
            <IncomeExpenseCard analysis={analysis} />
            <DealMetrics analysis={analysis} />
          </>
        ) : (
          <InputsMessage
            data-testid="deal-na"
            errors={errors}
            message={
              !validation.valid
                ? 'Fix the loan inputs to see the deal analysis.'
                : activeScenario.rental
                  ? 'Fix the rental inputs to see the deal analysis.'
                  : 'Add rent to see the deal analysis.'
            }
          />
        )}
      </Section>

      {activeScenario.rental ? (
        <Section>
          <SectionHeader
            title="Projection assumptions"
            lede="Annual growth used by the multi-year charts below."
          />
          <GrowthFields
            rental={activeScenario.rental}
            errors={rentalErrors}
            onChange={(patch) => editRental(patch, 'sheet')}
          />
        </Section>
      ) : null}

      {analysis && validation.valid && schedule ? (
        <RentalChartsSection
          scenario={validation.scenario}
          schedule={schedule}
        />
      ) : null}

      {comparison ? (
        <Section>
          <SectionHeader title="Compare scenarios" />
          <ComparisonGrid
            comparison={comparison}
            columns={DEAL_COMPARISON_COLUMNS}
            scenarioNames={scenarioNames}
          />
        </Section>
      ) : null}
    </>
  );
}
