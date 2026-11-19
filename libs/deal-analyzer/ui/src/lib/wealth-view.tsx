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
import {
  currency,
  dealPayment,
  DealStrip,
  InputsMessage,
  PageHeader,
  Section,
  SectionHeader,
  WEALTH_PROFILE,
} from 'shared-ui';
import { NetWorthChart } from './net-worth-chart';
import { useWealthEditor } from './use-wealth-editor';
import { WealthAssumptionsPanel } from './wealth-assumptions-panel';
import { WealthSummary } from './wealth-summary';
import { WealthTable } from './wealth-table';

/**
 * The Wealth Projection page (spec 008), rendered at `/wealth`. Shares the
 * scenario store with the other pages (spec 003 FR-004).
 */
export function WealthView() {
  const { activeScenario } = useScenarios();
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
        naMessage = 'Add rent to project net worth.';
      } else if (rentalErrors.length > 0) {
        naMessage = 'Fix the rental inputs to see the projection.';
      } else if (!validation.valid || !schedule) {
        naMessage = 'Fix the loan inputs to see the projection.';
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

  const payment = dealPayment(activeScenario, schedule);
  const errors = [
    ...(validation.valid ? [] : validation.errors),
    ...rentalErrors,
  ];
  const horizon = ready?.years[ready.years.length - 1] ?? null;

  return (
    <>
      <DealStrip
        profile={WEALTH_PROFILE}
        headline={{
          label: 'Net worth',
          value: horizon?.netWorth ?? null,
          naReason: naMessage,
          format: (n) => currency.format(n),
          betterWhen: 'higher',
        }}
        errors={errors}
        payment={payment}
      />
      <PageHeader
        eyebrow="Analysis"
        title="Wealth Projection"
        lede="Project equity, cash flow and net worth over time."
        note="Simplified model, not tax advice."
      />

      {rental ? (
        <Section>
          <SectionHeader title="Projection assumptions" />
          <WealthAssumptionsPanel
            rental={rental}
            errors={[...validateWealth(rental), ...rentalErrors]}
            onWealthChange={setWealth}
            onGrowthChange={setGrowth}
            onTypicalRates={applyTypicalRates}
          />
        </Section>
      ) : null}

      <Section>
        <SectionHeader title="Net worth over time" />
        {ready ? (
          <>
            <WealthSummary projection={ready} />
            <NetWorthChart projection={ready} />
          </>
        ) : (
          <InputsMessage
            data-testid="wealth-na"
            errors={errors}
            message={naMessage}
          />
        )}
      </Section>

      {ready ? (
        <Section>
          <SectionHeader title="Year by year" />
          <WealthTable
            projection={ready}
            hasExtraPayments={activeScenario.extraPayments.length > 0}
          />
        </Section>
      ) : null}
    </>
  );
}
