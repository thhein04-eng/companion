'use client';

import { useRef, useState } from 'react';
import {
  DEAL_FIELD_LABELS,
  formatDealField,
  formatRentWithUnits,
  hasOwnerUnit,
  normalizeUnits,
  readDealField,
  type FieldError,
} from 'shared-calculations';
import {
  useDealEdits,
  useRentalEditor,
  useScenarios,
} from 'shared-data-access';
import { Button } from '../ds/button';
import type { ChipTone } from '../ds/chip';
import { DealValue } from './deal-value';
import { Popover } from '../ds/popover';
import { DownPaymentField } from '../cost-breakdown-panel';
import { currency } from '../formatters';
import { isPrincipalDerived, TermField } from '../loan-input-form';
import { NumberField } from '../number-field';
import { useDealSheet } from './deal-sheet-context';
import { patchEdits } from './patch-edits';
import type { DealChipKey, DealPayment, Headline } from './page-profiles';

export interface ChipPopoverProps {
  chip: DealChipKey;
  tone: ChipTone;
  headline: Headline;
  payment: DealPayment | null;
  errors: FieldError[];
}

const errorFor = (errors: FieldError[], field: string) =>
  errors.find(
    (e) =>
      e.field === field ||
      // Rent roll errors show on the Rent value (spec 012 R7).
      (field === 'rental.grossMonthlyRent' &&
        (e.field.startsWith('rental.units') ||
          e.field === 'rental.moveOutYears')),
  )?.message;

/** The headline preview line: "DSCR 1.18 → 1.24", or why it can't be shown (FR-005). */
export function HeadlinePreview({
  headline,
  atOpen,
}: {
  headline: Headline;
  atOpen: number | null;
}) {
  if (headline.value == null) {
    return headline.naReason ? (
      <p className="m-0 text-small text-muted" data-testid="headline-preview">
        {headline.naReason}
      </p>
    ) : null;
  }
  const changed = atOpen != null && atOpen !== headline.value;
  const better =
    changed &&
    (headline.betterWhen === 'higher'
      ? headline.value > (atOpen as number)
      : headline.value < (atOpen as number));
  return (
    <p
      className={`m-0 text-small num ${changed ? (better ? 'text-good' : 'text-bad') : 'text-muted'}`}
      data-testid="headline-preview"
    >
      {headline.label} {atOpen != null ? `${headline.format(atOpen)} → ` : ''}
      {headline.format(headline.value)}
      {changed ? (
        <span data-testid="headline-delta" className="ml-1.5 font-semibold">
          {headline.value > (atOpen as number) ? '+' : '−'}
          {headline.format(Math.abs(headline.value - (atOpen as number)))}
        </span>
      ) : null}
    </p>
  );
}

/** One strip chip and its single-field editor popover (spec 010 FR-004, FR-005). */
export function ChipPopover({
  chip,
  tone,
  headline,
  payment,
  errors,
}: ChipPopoverProps) {
  const { activeScenario: scenario } = useScenarios();
  const { editDeal, endGesture } = useDealEdits();
  useRentalEditor();
  const sheet = useDealSheet();
  const [open, setOpen] = useState(false);
  const atOpen = useRef<number | null>(null);
  const onChange = patchEdits(editDeal, 'chip');

  const isTotal = chip === 'total';
  const label = isTotal ? 'Total' : DEAL_FIELD_LABELS[chip];
  const raw = isTotal ? null : readDealField(scenario, chip);
  const error = isTotal ? undefined : errorFor(errors, chip);
  const value = isTotal
    ? payment
      ? `${currency.format(payment.total)}/mo`
      : '—'
    : raw == null
      ? 'Add'
      : chip === 'rental.grossMonthlyRent' && scenario.rental
        ? formatRentWithUnits(scenario.rental)
        : formatDealField(chip, raw);
  const effectiveTone: ChipTone = error ? 'err' : tone;

  // A rent roll of 2+ units, or one the owner lives in, is edited in the sheet's rent roll, not
  // through one number (spec 012 FR-005).
  if (
    chip === 'rental.grossMonthlyRent' &&
    scenario.rental &&
    (normalizeUnits(scenario.rental).length >= 2 ||
      hasOwnerUnit(scenario.rental))
  ) {
    return (
      <DealValue
        tone={effectiveTone}
        label={label}
        value={value}
        data-chip={chip}
        aria-label={`${label} ${value}${error ? ' invalid' : ''}, edit the rent roll`}
        aria-invalid={error ? true : undefined}
        onClick={(event) =>
          sheet.open({
            focusField: 'rental.grossMonthlyRent',
            returnFocus: event.currentTarget,
          })
        }
      />
    );
  }

  const editor = (() => {
    switch (chip) {
      case 'total':
        return (
          <div className="flex flex-col gap-1.5">
            {payment?.parts.map((p) => (
              <div
                key={p.field}
                className="flex justify-between gap-3 text-[13.5px]"
              >
                <span className="text-muted">{p.label}</span>
                <b className="num font-semibold">
                  {currency.format(p.monthly)}
                </b>
              </div>
            )) ?? (
              <p className="m-0 text-small text-muted">
                Fix the loan inputs to see the payment.
              </p>
            )}
            <Button
              size="sm"
              onClick={() => {
                setOpen(false);
                sheet.open({ focusField: 'annualPropertyTax' });
              }}
            >
              Edit costs
            </Button>
          </div>
        );
      case 'downPayment':
        return (
          <DownPaymentField
            scenario={scenario}
            errors={errors}
            onChange={onChange}
            scrub
          />
        );
      case 'termMonths':
        return (
          <TermField
            scenario={scenario}
            errors={errors}
            onChange={onChange}
            scrub={{ field: 'termMonths', unitMonths: 12 }}
          />
        );
      case 'principal':
        return (
          <NumberField
            label="Loan amount"
            variant="currency"
            min={0}
            value={scenario.principal}
            onValueChange={(v) => editDeal('principal', v ?? 0, 'chip')}
            description={
              isPrincipalDerived(scenario)
                ? 'Calculated from price and down payment. Type to override.'
                : undefined
            }
            error={error}
            scrub={{ field: 'principal' }}
          />
        );
      case 'homePrice':
        return (
          <NumberField
            label="Home price"
            variant="currency"
            min={0}
            value={scenario.homePrice}
            onValueChange={(v) => editDeal('homePrice', v, 'chip')}
            error={error}
            scrub={{ field: 'homePrice' }}
          />
        );
      case 'annualInterestRatePct':
        return (
          <NumberField
            label="Annual interest rate"
            suffix="%"
            min={0}
            step={0.125}
            value={scenario.annualInterestRatePct}
            onValueChange={(v) =>
              editDeal('annualInterestRatePct', v ?? 0, 'chip')
            }
            error={error}
            scrub={{ field: 'annualInterestRatePct' }}
          />
        );
      case 'rental.grossMonthlyRent':
        return (
          <NumberField
            label="Monthly rent"
            variant="currency"
            min={0}
            value={scenario.rental?.grossMonthlyRent ?? null}
            onValueChange={(v) => {
              if (scenario.rental == null && v == null) return;
              editDeal('rental.grossMonthlyRent', v ?? 0, 'chip');
            }}
            error={error}
            scrub={{ field: 'rental.grossMonthlyRent' }}
          />
        );
    }
  })();

  return (
    <Popover
      label={`Edit ${label}`}
      open={open}
      onOpenChange={(next) => {
        if (next) atOpen.current = headline.value;
        else endGesture();
        setOpen(next);
      }}
      trigger={
        <DealValue
          tone={effectiveTone}
          label={label}
          value={isTotal ? value : raw == null ? null : value}
          data-chip={chip}
          aria-label={`${isTotal ? 'Monthly payment' : label} ${raw == null && !isTotal ? 'Add' : value}${error ? ' invalid' : ''}`}
          aria-invalid={error ? true : undefined}
        />
      }
    >
      {editor}
      <HeadlinePreview headline={headline} atOpen={atOpen.current} />
    </Popover>
  );
}
