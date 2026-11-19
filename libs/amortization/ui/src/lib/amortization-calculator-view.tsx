'use client';

import { useMemo, useState } from 'react';
import {
  compareScenarios,
  computeLtv,
  computeSchedule,
  computeValidSchedules,
  validateScenario,
} from 'shared-calculations';
import { useScenarios } from 'shared-data-access';
import {
  AMORTIZATION_PROFILE,
  ComparisonGrid,
  currency,
  dealPayment,
  DealStrip,
  InputsMessage,
  LOAN_COMPARISON_COLUMNS,
  MetricBadge,
  MetricBadgeGroup,
  PageHeader,
  Section,
  SectionHeader,
} from 'shared-ui';
import { ChartsSection } from './charts/charts-section';
import { ScenarioBalanceChart } from './charts/scenario-balance-chart';
import { ExportScheduleButton } from './export-schedule-button';
import { ExtraPaymentPanel } from './extra-payment-panel';
import {
  DEFAULT_SCHEDULE_PAGE_SIZE,
  type SchedulePaginationState,
} from './schedule-pagination';
import { ScheduleTable } from './schedule-table';

/** The Amortization Calculator page (spec 001), rendered at `/amortization`. */
export function AmortizationCalculatorView() {
  const { scenarios, activeScenarioId, activeScenario, updateActiveScenario } =
    useScenarios();

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

  // Memoized on the scenario so paging (004), which re-renders this view,
  // doesn't recompute the schedule.
  const { validation, schedule } = useMemo(() => {
    const validation = validateScenario(activeScenario);
    const schedule = validation.valid
      ? computeSchedule(validation.scenario)
      : null;
    return { validation, schedule };
  }, [activeScenario]);
  const ltv = computeLtv(activeScenario);

  // Also keeps the valid schedules so the scenario chart (spec 005) reuses them.
  const comparisonData = useMemo(() => {
    const schedules = computeValidSchedules(scenarios).map((e) => e.schedule);
    return schedules.length >= 2
      ? { schedules, comparison: compareScenarios(schedules) }
      : null;
  }, [scenarios]);
  const comparison = comparisonData?.comparison ?? null;

  const scenarioNames = Object.fromEntries(
    scenarios.map((s) => [s.id, s.name]),
  );

  const payment = dealPayment(activeScenario, schedule);
  const errors = validation.valid ? [] : validation.errors;

  return (
    <>
      <PageHeader
        eyebrow="Analysis"
        title="Amortization Calculator"
        lede="Model a mortgage payment, its full schedule, real-estate costs, and early-payoff savings."
      />

      <DealStrip
        profile={AMORTIZATION_PROFILE}
        headline={{
          label: 'Total monthly payment',
          value: schedule?.summary.totalMonthlyPayment ?? null,
          naReason: schedule ? null : 'Fix the loan inputs to see the payment.',
          format: (n) => currency.format(n),
          betterWhen: 'lower',
        }}
        errors={errors}
        payment={payment}
      />

      {activeScenario.homePrice != null ? (
        <MetricBadgeGroup>
          <MetricBadge label="LTV" value={ltv.value} naReason={ltv.naReason} />
        </MetricBadgeGroup>
      ) : null}

      <Section>
        <SectionHeader
          title="Extra payments"
          lede="Pay down principal early and see the interest you save."
        />
        <ExtraPaymentPanel
          extraPayments={activeScenario.extraPayments}
          onChange={(extraPayments) => updateActiveScenario({ extraPayments })}
        />
        {schedule?.baselineComparison ? (
          <p className="m-0 rounded-md bg-good-soft px-3.5 py-2.5 text-[14px] text-good">
            Paying extra saves{' '}
            <b className="num">
              {currency.format(schedule.baselineComparison.interestSaved)}
            </b>{' '}
            in interest and{' '}
            <b className="num">{schedule.baselineComparison.periodsSaved}</b>{' '}
            payments versus the baseline schedule.
          </p>
        ) : null}
      </Section>

      {schedule && validation.valid ? (
        <ChartsSection scenario={validation.scenario} schedule={schedule} />
      ) : null}

      {schedule ? (
        <Section>
          <SectionHeader
            title="Amortization schedule"
            actions={<ExportScheduleButton schedule={schedule} />}
          />
          <ScheduleTable
            periods={schedule.periods}
            pagination={schedulePagination}
            onPaginationChange={setSchedulePagination}
          />
        </Section>
      ) : (
        <InputsMessage
          errors={errors}
          message="Fix the loan inputs to see the amortization schedule."
        />
      )}

      {comparison ? (
        <Section>
          <SectionHeader title="Compare scenarios" />
          <ComparisonGrid
            comparison={comparison}
            columns={LOAN_COMPARISON_COLUMNS}
            scenarioNames={scenarioNames}
          />
          <ScenarioBalanceChart
            schedules={comparisonData?.schedules ?? []}
            scenarios={scenarios}
          />
        </Section>
      ) : null}
    </>
  );
}
