'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { computeSchedule, validateScenario } from 'shared-calculations';
import {
  analyzeSale,
  resolveSaleAssumptions,
  validateExit,
  validateRental,
  validateSale,
  validateWealth,
  type SaleAnalysis,
} from 'deal-analyzer-calculations';
import { useScenarios } from 'shared-data-access';
import {
  currency,
  dealPayment,
  DealStrip,
  InputsMessage,
  PageHeader,
  SALE_PROFILE,
  Section,
  SectionHeader,
} from 'shared-ui';
import { BreakEvenCard } from './break-even-card';
import { SaleAssumptionsPanel } from './sale-assumptions-panel';
import { SaleSummary } from './sale-summary';
import { SaleTaxPanel } from './sale-tax-panel';
import { useSaleEditor } from './use-sale-editor';

/**
 * The Sale Profit & Exit Analyzer page (spec 013), rendered at `/sale`, on the spec 010 Deal
 * Strip. Works with or without a rental: a non-rental sale has no cash flow.
 */
export function SaleView() {
  const { activeScenario } = useScenarios();
  const editor = useSaleEditor();
  const rental = activeScenario.rental ?? null;

  const { validation, schedule, rentalErrors, analysis, naMessage } =
    useMemo(() => {
      const validation = validateScenario(activeScenario);
      const schedule = validation.valid
        ? computeSchedule(validation.scenario)
        : null;
      const rental = activeScenario.rental ?? null;
      const rentalErrors = rental ? validateRental(rental) : [];
      let analysis: SaleAnalysis | null = null;
      let naMessage: string | null = null;
      // contracts/sale-ui.md: the first reason that applies.
      if (!validation.valid || !schedule)
        naMessage = 'Fix the loan inputs to see the result.';
      else if (rentalErrors.length > 0)
        naMessage = 'Fix the rental inputs to see the result.';
      else {
        analysis = analyzeSale(validation.scenario, schedule);
        naMessage = analysis.naReason;
      }
      return { validation, schedule, rentalErrors, analysis, naMessage };
    }, [activeScenario]);

  const assumptions = resolveSaleAssumptions(activeScenario);
  const result = analysis?.result ?? null;
  const payment = dealPayment(activeScenario, schedule);
  const errors = [
    ...(validation.valid ? [] : validation.errors),
    ...rentalErrors,
  ];
  const panelErrors = [
    ...validateSale(activeScenario),
    ...(rental ? [...validateExit(rental), ...validateWealth(rental)] : []),
    ...rentalErrors,
  ];

  return (
    <>
      <DealStrip
        profile={SALE_PROFILE}
        headline={{
          label: 'Net profit',
          value: result?.totalNetProfit ?? null,
          naReason: naMessage,
          format: (n) => currency.format(n),
          betterWhen: 'higher',
        }}
        errors={errors}
        payment={payment}
      />
      <PageHeader
        eyebrow="Analysis"
        title="Sale Profit & Exit Analyzer"
        lede="Should you sell now? Profit, break-even price and an optional tax estimate."
        note="Simplified model, not tax advice."
      />

      <Section>
        <SectionHeader title="Assumptions" />
        <SaleAssumptionsPanel
          assumptions={assumptions}
          rental={rental}
          errors={panelErrors}
          onExitMonthChange={editor.setExitMonth}
          onExitUnitChange={editor.setExitUnit}
          onAppreciationChange={editor.setAppreciation}
          onSellingCostsChange={editor.setSellingCosts}
          onGrowthChange={editor.setGrowth}
          onTaxChange={editor.setTax}
          onLandShareChange={editor.setLandShare}
        />
      </Section>

      <Section>
        <SectionHeader title="Result" />
        {result ? (
          <SaleSummary result={result} unit={assumptions.exitUnit} />
        ) : (
          <InputsMessage
            data-testid="sale-na"
            errors={errors}
            message={naMessage}
          />
        )}
      </Section>

      {result ? (
        <Section>
          <SectionHeader title="Break-even" />
          <BreakEvenCard result={result} />
        </Section>
      ) : null}

      {result && assumptions.tax.enabled ? (
        <Section>
          <SectionHeader title="Tax estimate" />
          <SaleTaxPanel result={result} />
        </Section>
      ) : null}

      <p className="m-0 text-small">
        <Link
          href="/pro-forma"
          className="text-accent underline-offset-2 hover:underline"
        >
          See IRR and year-by-year returns on Hold &amp; Exit →
        </Link>
      </p>
    </>
  );
}
