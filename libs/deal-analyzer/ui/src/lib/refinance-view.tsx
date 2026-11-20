'use client';

import { useMemo } from 'react';
import { computeSchedule, validateScenario } from 'shared-calculations';
import {
  analyzeCashOut,
  analyzeRateDrop,
  resolveRefinanceAssumptions,
  validateRefinance,
  validateRental,
  type CashOutAnalysis,
  type RateDropAnalysis,
} from 'deal-analyzer-calculations';
import { useScenarios } from 'shared-data-access';
import {
  currency,
  dealPayment,
  DealStrip,
  InputsMessage,
  PageHeader,
  REFINANCE_PROFILE,
  Section,
  SectionHeader,
} from 'shared-ui';
import { CashOutSummary } from './cash-out-summary';
import { breakevenHeadline, RateDropSummary } from './rate-drop-summary';
import { RefinanceInputsPanel } from './refinance-inputs-panel';
import { useRefinanceEditor } from './use-refinance-editor';

/**
 * The Refinance & BRRRR Modeling page (spec 014), rendered at `/refinance`, on the spec 010 Deal
 * Strip. Cash-out mode works with or without a rental (a non-rental has no cash-on-cash); Rate-drop
 * mode never needs one, so a rental error does not block it.
 */
export function RefinanceView() {
  const { activeScenario } = useScenarios();
  const editor = useRefinanceEditor();

  const { validation, schedule, rentalErrors, cashOut, rateDrop, naMessage } =
    useMemo(() => {
      const validation = validateScenario(activeScenario);
      const schedule = validation.valid
        ? computeSchedule(validation.scenario)
        : null;
      const rental = activeScenario.rental ?? null;
      const rentalErrors = rental ? validateRental(rental) : [];
      const rateDropMode =
        resolveRefinanceAssumptions(activeScenario).mode === 'rate-drop';
      let cashOut: CashOutAnalysis | null = null;
      let rateDrop: RateDropAnalysis | null = null;
      let naMessage: string | null = null;
      // contracts/refinance-ui.md § States: the first reason that applies.
      if (!validation.valid || !schedule) {
        naMessage = 'Fix the loan inputs to see the result.';
      } else if (rateDropMode) {
        rateDrop = analyzeRateDrop(validation.scenario, schedule);
        naMessage = rateDrop.naReason;
      } else if (rentalErrors.length > 0) {
        naMessage = 'Fix the rental inputs to see the result.';
      } else {
        cashOut = analyzeCashOut(validation.scenario, schedule);
        naMessage = cashOut.naReason;
      }
      return {
        validation,
        schedule,
        rentalErrors,
        cashOut,
        rateDrop,
        naMessage,
      };
    }, [activeScenario]);

  const errors = [
    ...(validation.valid ? [] : validation.errors),
    ...rentalErrors,
  ];
  const payment = dealPayment(activeScenario, schedule);
  const assumptions = resolveRefinanceAssumptions(activeScenario);
  const panelErrors = [...validateRefinance(activeScenario), ...rentalErrors];
  const cashOutResult = cashOut?.result ?? null;
  const rateDropResult = rateDrop?.result ?? null;
  const breakeven = rateDropResult ? breakevenHeadline(rateDropResult) : null;

  return (
    // A fragment, as in SaleView: `main.page-grid` places each direct child in its content column.
    <>
      <DealStrip
        profile={REFINANCE_PROFILE}
        headline={
          assumptions.mode === 'rate-drop'
            ? {
                label: 'Breakeven',
                value: breakeven?.value ?? null,
                naReason: breakeven?.naReason ?? naMessage,
                format: (n) => (n === 0 ? 'Immediate' : `${n} mo`),
                betterWhen: 'lower',
              }
            : {
                label: 'Cash left in deal',
                value: cashOutResult?.cashLeft ?? null,
                naReason: naMessage,
                format: (n) => currency.format(n),
                betterWhen: 'lower',
              }
        }
        errors={errors}
        payment={payment}
      />
      <PageHeader
        eyebrow="Analysis"
        title="Refinance & BRRRR Modeling"
        lede="Refinance after the rehab, or chase a lower rate. See the cash left in the deal and when a lower rate pays for itself."
        note="Simplified model, not financial advice."
      />

      <Section>
        <SectionHeader title="Assumptions" />
        <RefinanceInputsPanel
          stored={activeScenario.refinance ?? {}}
          assumptions={assumptions}
          rental={activeScenario.rental ?? null}
          errors={panelErrors}
          editor={editor}
        />
      </Section>

      <Section>
        <SectionHeader title="Result" />
        {cashOutResult ? (
          <CashOutSummary result={cashOutResult} />
        ) : rateDropResult ? (
          <RateDropSummary result={rateDropResult} />
        ) : (
          <InputsMessage
            data-testid="refinance-na"
            errors={errors}
            message={naMessage}
          />
        )}
      </Section>
    </>
  );
}
