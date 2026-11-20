'use client';

import { useMemo, useState } from 'react';
import { computeSchedule, validateScenario } from 'shared-calculations';
import {
  analyzeDeal,
  buildSensitivityGrid,
  maxAllowableOffer,
  validateRental,
  validateSensitivityTarget,
  type SensitivityMeasure,
} from 'deal-analyzer-calculations';
import { useDealEdits, useScenarios } from 'shared-data-access';
import {
  currency,
  dealPayment,
  DealStrip,
  InputsMessage,
  PageHeader,
  percent1,
  SegmentedControl,
  SENSITIVITY_PROFILE,
  Section,
  SectionHeader,
} from 'shared-ui';
import { MaxOfferCard } from './max-offer-card';
import { SensitivityGrid } from './sensitivity-grid';
import { dollars0, minus, targetText } from './sensitivity-format';
import { useSensitivityEditor } from './use-sensitivity-editor';

const MEASURES = [
  { value: 'cashFlow', label: 'Monthly cash flow' },
  { value: 'cashOnCash', label: 'Cash-on-Cash' },
] as const;
const VARY = [
  { value: 'price', label: 'Price' },
  { value: 'rent', label: 'Rent' },
] as const;
const RATE_STEPS = [
  { value: '0.25', label: '0.25%' },
  { value: '0.5', label: '0.5%' },
  { value: '1', label: '1%' },
] as const;
const COLUMN_STEPS = [
  { value: '2.5', label: '2.5%' },
  { value: '5', label: '5%' },
  { value: '10', label: '10%' },
] as const;

/**
 * The Sensitivity Matrix & Max Allowable Offer page (spec 017), rendered at `/sensitivity` on the
 * shared deal card. It needs a rental with a price and a down payment; until it has them, it shows
 * what's missing instead of a grid. The grid's display choices (measure, column variable, steps)
 * are page state; the target is saved on the scenario (`useSensitivityEditor`).
 */
export function SensitivityView() {
  const { activeScenario } = useScenarios();
  const [measure, setMeasure] = useState<SensitivityMeasure>('cashFlow');
  const [variable, setVariable] = useState<'price' | 'rent'>('price');
  const [rateStep, setRateStep] = useState('0.5');
  const [columnStep, setColumnStep] = useState('5');
  const { editDeal } = useDealEdits();
  const {
    target,
    setMeasure: setTargetMeasure,
    setValue: setTargetValue,
  } = useSensitivityEditor(measure);
  const targetErrors = useMemo(
    () => validateSensitivityTarget(target),
    [target],
  );

  const { validation, schedule, rentalErrors, analysis, naMessage } =
    useMemo(() => {
      const validation = validateScenario(activeScenario);
      const schedule = validation.valid
        ? computeSchedule(validation.scenario)
        : null;
      const rental = activeScenario.rental ?? null;
      const rentalErrors = rental ? validateRental(rental) : [];

      // The first reason that applies (contracts/ui.md).
      let naMessage: string | null = null;
      if (!validation.valid || !schedule)
        naMessage = 'Fix the loan inputs to see the sensitivity.';
      else if (rentalErrors.length > 0)
        naMessage = 'Fix the rental inputs to see the sensitivity.';
      else if (!rental) naMessage = 'Add rent to see the sensitivity.';
      else if (!(
        activeScenario.homePrice != null && activeScenario.homePrice > 0
      ))
        naMessage = 'Add a home price to see the sensitivity.';
      else if (!activeScenario.downPayment)
        naMessage = 'Add a down payment to see the sensitivity.';

      const analysis =
        naMessage == null && validation.valid && schedule
          ? analyzeDeal(validation.scenario, schedule)
          : null;
      return { validation, schedule, rentalErrors, analysis, naMessage };
    }, [activeScenario]);

  // The offer and the grid are memoized on the scenario and their controls, so typing elsewhere
  // doesn't redo them (research R4; the timing tests keep each well under 100 ms).
  const offer = useMemo(
    () =>
      naMessage == null && validation.valid
        ? maxAllowableOffer(validation.scenario, {
            measure: target.measure,
            value: target.value,
          })
        : null,
    [naMessage, validation, target.measure, target.value],
  );
  const maxOfferPrice = offer?.status === 'found' ? offer.price : null;
  const markMeasure = target.isSet ? target.measure : null;
  const markValue = target.value;
  const grid = useMemo(
    () =>
      naMessage == null && validation.valid
        ? buildSensitivityGrid(validation.scenario, {
            columnVariable: variable,
            rateStepPct: Number(rateStep),
            columnStepPct: Number(columnStep),
            target: markMeasure
              ? { measure: markMeasure, value: markValue }
              : undefined,
            maxOfferPrice,
          })
        : null,
    [
      naMessage,
      validation,
      variable,
      rateStep,
      columnStep,
      markMeasure,
      markValue,
      maxOfferPrice,
    ],
  );
  const markTarget = markMeasure
    ? { measure: markMeasure, value: markValue }
    : null;
  const homePrice = activeScenario.homePrice ?? 0;

  const payment = dealPayment(activeScenario, schedule);
  const errors = [
    ...(validation.valid ? [] : validation.errors),
    ...rentalErrors,
  ];

  return (
    <>
      <DealStrip
        profile={SENSITIVITY_PROFILE}
        headline={{
          label: 'Cash flow',
          value: analysis?.cashFlow.monthly ?? null,
          naReason: naMessage,
          format: (n) => `${currency.format(n)}/mo`,
          betterWhen: 'higher',
        }}
        errors={errors}
        payment={payment}
        sheet={{ totalCashInvested: analysis?.totalCashInvested ?? null }}
      />
      <PageHeader
        eyebrow="Analysis"
        title="Sensitivity & Max Offer"
        lede="Stress-test a deal against rate, price and rent, and find the highest offer that still meets your target."
      />

      {naMessage != null ? (
        <InputsMessage
          data-testid="sensitivity-na"
          errors={errors}
          message={naMessage}
        />
      ) : null}

      {grid ? (
        <Section>
          <SectionHeader
            title="Sensitivity grid"
            lede="How the deal moves as the interest rate and the price or rent change. The ringed cell is your deal as entered."
          />
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <SegmentedControl
              label="Measure"
              showLabel
              value={measure}
              options={MEASURES}
              onValueChange={setMeasure}
              data-testid="sensitivity-measure"
            />
            <SegmentedControl
              label="Vary"
              showLabel
              value={variable}
              options={VARY}
              onValueChange={setVariable}
              data-testid="sensitivity-vary"
            />
            <SegmentedControl
              label="Rate step"
              showLabel
              value={rateStep}
              options={RATE_STEPS}
              onValueChange={setRateStep}
              data-testid="sensitivity-rate-step"
            />
            <SegmentedControl
              label="Column step"
              showLabel
              value={columnStep}
              options={COLUMN_STEPS}
              onValueChange={setColumnStep}
              data-testid="sensitivity-column-step"
            />
          </div>
          <SensitivityGrid
            grid={grid}
            measure={measure}
            data-testid="sensitivity-grid"
          />
          <p
            data-testid="sensitivity-legend"
            className="m-0 text-small text-muted"
          >
            {markTarget
              ? `▼ below your ${targetText(markTarget)} target · `
              : ''}
            −&nbsp;negative · ring&nbsp;=&nbsp;current&nbsp;deal
          </p>
          {grid.maoColumn ? (
            <p
              data-testid="sensitivity-mao-line"
              className="m-0 text-small text-fg"
            >
              Max offer {dollars0.format(grid.maoColumn.price)} is{' '}
              {minus(
                `${grid.maoColumn.pct > 0 ? '+' : ''}${percent1.format(grid.maoColumn.pct / 100)}`,
              )}{' '}
              from your price.
            </p>
          ) : null}
        </Section>
      ) : null}

      {grid && offer ? (
        <Section>
          <SectionHeader
            title="Max allowable offer"
            lede="Set the return you need and see the highest price you can offer."
          />
          <MaxOfferCard
            homePrice={homePrice}
            target={target}
            result={offer}
            errors={targetErrors}
            onMeasureChange={setTargetMeasure}
            onValueChange={setTargetValue}
            onUsePrice={(price) => editDeal('homePrice', price, 'page')}
          />
        </Section>
      ) : null}
    </>
  );
}
