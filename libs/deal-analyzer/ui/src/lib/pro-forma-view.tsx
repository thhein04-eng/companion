'use client';

import { useMemo } from 'react';
import { computeSchedule, validateScenario } from 'shared-calculations';
import {
  compareHolds,
  projectExit,
  resolveExitAssumptions,
  validateExit,
  validateRental,
  validateWealth,
  type ExitProjection,
} from 'deal-analyzer-calculations';
import { useScenarios } from 'shared-data-access';
import {
  dealPayment,
  DealStrip,
  InputsMessage,
  PageHeader,
  percent2,
  PRO_FORMA_PROFILE,
  Section,
  SectionHeader,
} from 'shared-ui';
import { ExitAssumptionsPanel } from './exit-assumptions-panel';
import { ExitSummary } from './exit-summary';
import { HoldComparisonTable } from './hold-comparison-table';
import { ProFormaTable } from './pro-forma-table';
import { useExitEditor } from './use-exit-editor';

/**
 * The Hold & Exit Pro Forma page (spec 009), rendered at `/pro-forma`, on the spec 010 Deal
 * Strip: shared inputs live in the strip and sheet; hold, sale, growth and tax stay inline.
 */
export function ProFormaView() {
  const { activeScenario } = useScenarios();
  const { setExit, setGrowth, applyExampleRates, setTax } = useExitEditor();
  const rental = activeScenario.rental ?? null;

  const {
    validation,
    schedule,
    rentalErrors,
    projection,
    comparison,
    naMessage,
  } = useMemo(() => {
    const validation = validateScenario(activeScenario);
    const schedule = validation.valid
      ? computeSchedule(validation.scenario)
      : null;
    const rental = activeScenario.rental ?? null;
    const rentalErrors = rental ? validateRental(rental) : [];
    let projection: ExitProjection | null = null;
    let comparison: ExitProjection[] = [];
    let naMessage: string | null = null;
    // Spec 009 contracts: the first reason that applies (reworded for spec 010 FR-024).
    if (!rental) naMessage = 'Add rent to model a sale.';
    else if (rentalErrors.length > 0)
      naMessage = 'Fix the rental inputs to see the exit.';
    else if (!validation.valid || !schedule)
      naMessage = 'Fix the loan inputs to see the exit.';
    else {
      projection = projectExit(validation.scenario, schedule);
      naMessage = projection.naReason;
      if (projection.result)
        comparison = compareHolds(validation.scenario, schedule);
    }
    return {
      validation,
      schedule,
      rentalErrors,
      projection,
      comparison,
      naMessage,
    };
  }, [activeScenario]);

  const result = projection?.result ?? null;
  const payment = dealPayment(activeScenario, schedule);
  const errors = [
    ...(validation.valid ? [] : validation.errors),
    ...rentalErrors,
  ];

  return (
    <>
      <DealStrip
        profile={PRO_FORMA_PROFILE}
        headline={{
          label: 'IRR',
          value: result?.preTax.irr.value ?? null,
          naReason: naMessage ?? result?.preTax.irr.naReason ?? null,
          format: (n) => percent2.format(n),
          betterWhen: 'higher',
        }}
        errors={errors}
        payment={payment}
      />
      <PageHeader
        eyebrow="Analysis"
        title="Hold & Exit Pro Forma"
        lede="Model a sale after holding the property: IRR, profit and equity multiple."
        note="Simplified model, not tax advice."
      />

      {rental ? (
        <Section>
          <SectionHeader title="Assumptions" />
          <ExitAssumptionsPanel
            rental={rental}
            errors={[
              ...validateExit(rental),
              ...validateWealth(rental),
              ...rentalErrors,
            ]}
            onExitChange={setExit}
            onGrowthChange={setGrowth}
            onExampleRates={applyExampleRates}
            onTaxChange={setTax}
          />
        </Section>
      ) : null}

      <Section>
        <SectionHeader title="Exit" />
        {result ? (
          <ExitSummary result={result} />
        ) : (
          <InputsMessage
            data-testid="pro-forma-na"
            errors={errors}
            message={naMessage}
          />
        )}
      </Section>

      {result && rental ? (
        <Section>
          <SectionHeader title="Compare hold periods" />
          <HoldComparisonTable
            projections={comparison}
            chosen={resolveExitAssumptions(rental).holdYears}
          />
        </Section>
      ) : null}

      {result ? (
        <Section>
          <SectionHeader title="Pro forma" />
          <ProFormaTable
            result={result}
            moveOutYear={projection?.moveOutYear ?? null}
          />
        </Section>
      ) : null}
    </>
  );
}
