'use client';

import type {
  MaxOfferResult,
  OfferFigures,
  SensitivityMeasure,
  SensitivityTarget,
} from 'deal-analyzer-calculations';
import type { FieldError } from 'shared-calculations';
import {
  Button,
  Card,
  currency,
  NumberField,
  percent1,
  percent2,
  SegmentedControl,
} from 'shared-ui';
import { dollars0, minus } from './sensitivity-format';

const TARGET_MEASURES = [
  { value: 'cashOnCash', label: 'Cash-on-Cash' },
  { value: 'cashFlow', label: 'Monthly cash flow' },
] as const;

export interface MaxOfferCardProps {
  /** The deal's current price. */
  homePrice: number;
  target: SensitivityTarget & { isSet: boolean };
  result: MaxOfferResult;
  /** Errors on the target field (`validateSensitivityTarget`). */
  errors: FieldError[];
  onMeasureChange: (measure: SensitivityMeasure) => void;
  onValueChange: (value: number | null) => void;
  /** "Use this price": the page sets the deal's home price. */
  onUsePrice: (price: number) => void;
}

/** The target's measure at one price: "$300.52/mo" or "8.12%". */
function figure(f: OfferFigures, measure: SensitivityMeasure): string {
  const v = measure === 'cashFlow' ? f.cashFlowMonthly : f.cashOnCash;
  if (v == null) return 'n/a';
  return measure === 'cashFlow'
    ? `${minus(currency.format(v))}/mo`
    : minus(percent2.format(v));
}

/**
 * The Max Allowable Offer (spec 015 US2, contracts/ui.md): the target controls and the result.
 * Until the investor has set a target, the card shows the defaults and says so.
 */
export function MaxOfferCard({
  homePrice,
  target,
  result,
  errors,
  onMeasureChange,
  onValueChange,
  onUsePrice,
}: MaxOfferCardProps) {
  const targetError = errors[0]?.message;
  return (
    <Card data-testid="max-offer-card" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <SegmentedControl
          label="Target measure"
          showLabel
          value={target.measure}
          options={TARGET_MEASURES}
          onValueChange={onMeasureChange}
          data-testid="target-measure"
        />
        <div data-testid="target-value" className="w-44">
          <NumberField
            label="At least"
            variant={target.measure === 'cashFlow' ? 'currency' : 'plain'}
            suffix={target.measure === 'cashOnCash' ? '%' : undefined}
            step={target.measure === 'cashOnCash' ? 0.5 : 25}
            value={Number.isFinite(target.value) ? target.value : null}
            onValueChange={onValueChange}
            error={targetError}
          />
        </div>
        {!target.isSet ? (
          <p
            data-testid="target-default"
            className="m-0 pb-2 text-small text-muted"
          >
            Default target. Change it to set yours.
          </p>
        ) : null}
      </div>

      <div
        data-testid="max-offer"
        aria-live="polite"
        className="flex flex-col gap-2"
      >
        {result.status === 'found' ? (
          <Found
            result={result}
            homePrice={homePrice}
            measure={target.measure}
            onUsePrice={onUsePrice}
          />
        ) : result.status === 'unreachable' ? (
          <p
            data-testid="max-offer-unreachable"
            className="m-0 text-[15px] font-medium text-bad"
          >
            <span aria-hidden="true">✕ </span>
            {result.reason}
          </p>
        ) : targetError ? null : (
          <p className="m-0 text-small text-muted">{result.reason}</p>
        )}
      </div>
    </Card>
  );
}

function Found({
  result,
  homePrice,
  measure,
  onUsePrice,
}: {
  result: Extract<MaxOfferResult, { status: 'found' }>;
  homePrice: number;
  measure: SensitivityMeasure;
  onUsePrice: (price: number) => void;
}) {
  const delta = result.deltaFromCurrent;
  const pct = minus(
    `${delta > 0 ? '+' : ''}${percent1.format(result.deltaPct)}`,
  );
  const sameAsCurrent = result.price === Math.round(homePrice);
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[13px] font-medium text-muted">
          Max allowable offer
        </span>
        <strong
          data-testid="max-offer-price"
          className="num font-display text-[28px] font-semibold leading-tight text-fg"
        >
          {dollars0.format(result.price)}
        </strong>
      </div>
      <p data-testid="max-offer-delta" className="m-0 text-[14px] text-fg">
        {sameAsCurrent
          ? `The same as your price of ${dollars0.format(homePrice)}.`
          : `${dollars0.format(Math.abs(delta))} ${delta < 0 ? 'below' : 'above'} your price of ${dollars0.format(homePrice)} (${pct}).`}
      </p>
      {result.currentMeets ? (
        <p
          data-testid="max-offer-already"
          className="m-0 text-[14px] font-medium text-good"
        >
          <span aria-hidden="true">✓ </span>
          Your price already meets this target.
        </p>
      ) : null}
      <dl className="num m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[14px]">
        <dt className="text-muted">At the offer</dt>
        <dd className="m-0 font-semibold text-fg">
          {figure(result.atOffer, measure)}
        </dd>
        <dt className="text-muted">At your price</dt>
        <dd className="m-0 font-semibold text-fg">
          {figure(result.atCurrent, measure)}
        </dd>
      </dl>
      {sameAsCurrent ? null : (
        <div>
          <Button
            variant="primary"
            data-testid="use-max-offer"
            onClick={() => onUsePrice(result.price)}
          >
            Use this price
          </Button>
        </div>
      )}
    </>
  );
}
