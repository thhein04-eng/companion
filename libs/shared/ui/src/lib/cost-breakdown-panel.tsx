'use client';

import { useState, type ReactNode } from 'react';
import type { FieldError, LoanScenario } from 'shared-calculations';
import { NumberField } from './number-field';
import { SegmentedToggle } from './ds/segmented-toggle';
import { currency } from './formatters';
import { DerivedRow } from './loan-input-form';

type Patch = (patch: Partial<LoanScenario>) => void;

function errorFor(errors: FieldError[], field: string): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}

const DOWN_MODES = [
  { value: 'amount', label: '$' },
  { value: 'percent', label: '%' },
] as const;

/** Down payment as an amount or a percent, with an explicit $ / % toggle (spec 001 FR-005). */
export function DownPaymentField({
  scenario,
  errors = [],
  onChange,
  scrub,
}: {
  scenario: LoanScenario;
  errors?: FieldError[];
  onChange: Patch;
  scrub?: boolean;
}) {
  const [mode, setMode] = useState<'amount' | 'percent'>(
    scenario.downPayment && 'amount' in scenario.downPayment
      ? 'amount'
      : 'percent',
  );
  const value =
    scenario.downPayment && 'amount' in scenario.downPayment
      ? scenario.downPayment.amount
      : scenario.downPayment && 'percent' in scenario.downPayment
        ? scenario.downPayment.percent
        : null;
  return (
    <div className="flex flex-col gap-1.5" data-deal-field="downPayment">
      <div className="flex items-center justify-between">
        <span className="text-label font-medium text-muted">Down payment</span>
        <SegmentedToggle
          label="Down payment mode"
          value={mode}
          options={DOWN_MODES}
          onValueChange={(next) => {
            setMode(next);
            onChange({ downPayment: null });
          }}
        />
      </div>
      <NumberField
        label="Down payment"
        visuallyHiddenLabel
        variant={mode === 'amount' ? 'currency' : 'plain'}
        suffix={mode === 'percent' ? '%' : undefined}
        min={0}
        value={value}
        onValueChange={(next) =>
          onChange({
            downPayment:
              next == null
                ? null
                : mode === 'amount'
                  ? { amount: next }
                  : { percent: next },
          })
        }
        error={errorFor(errors, 'downPayment')}
        scrub={
          scrub
            ? {
                field: 'downPayment',
                step: mode === 'amount' ? 1000 : 1,
                toValue: (n) =>
                  mode === 'amount' ? { amount: n } : { percent: n },
              }
            : undefined
        }
      />
    </div>
  );
}

/** The Property group of the Edit deal sheet: home price and down payment. */
export function PropertyFields({
  scenario,
  errors = [],
  onChange,
  scrub,
}: {
  scenario: LoanScenario;
  errors?: FieldError[];
  onChange: Patch;
  scrub?: boolean;
}) {
  return (
    <div
      data-input-grid=""
      className="grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-2"
    >
      <div data-deal-field="homePrice">
        <NumberField
          label="Home price"
          variant="currency"
          min={0}
          value={scenario.homePrice}
          onValueChange={(value) => onChange({ homePrice: value })}
          error={errorFor(errors, 'homePrice')}
          scrub={scrub ? { field: 'homePrice' } : undefined}
        />
      </div>
      <DownPaymentField
        scenario={scenario}
        errors={errors}
        onChange={onChange}
        scrub={scrub}
      />
    </div>
  );
}

export interface MonthlyCostFieldsProps {
  scenario: LoanScenario;
  errors?: FieldError[];
  onChange: Patch;
  monthlyPrincipalAndInterest: number;
  totalMonthlyPayment: number;
  pmiDropPeriod: number | null;
  /** Shown above the fields (spec 010 US4 payment bar). */
  before?: ReactNode;
  scrub?: boolean;
}

/**
 * The Monthly costs group: tax, insurance, PMI and HOA, then the P&I and total payment rows,
 * with the total clearly separated from principal & interest (spec 001 SC-006).
 */
export function MonthlyCostFields({
  scenario,
  errors = [],
  onChange,
  monthlyPrincipalAndInterest,
  totalMonthlyPayment,
  pmiDropPeriod,
  before,
  scrub,
}: MonthlyCostFieldsProps) {
  return (
    <div className="flex flex-col gap-[var(--space-grid)]">
      {before}
      <div
        data-input-grid=""
        className="grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-2"
      >
        <div data-deal-field="annualPropertyTax">
          <NumberField
            label="Annual property tax"
            variant="currency"
            min={0}
            value={scenario.annualPropertyTax}
            onValueChange={(value) => onChange({ annualPropertyTax: value })}
            error={errorFor(errors, 'annualPropertyTax')}
            scrub={scrub ? { field: 'annualPropertyTax' } : undefined}
          />
        </div>
        <div data-deal-field="annualInsurance">
          <NumberField
            label="Annual homeowner's insurance"
            variant="currency"
            min={0}
            value={scenario.annualInsurance}
            onValueChange={(value) => onChange({ annualInsurance: value })}
            error={errorFor(errors, 'annualInsurance')}
            scrub={scrub ? { field: 'annualInsurance' } : undefined}
          />
        </div>
        <div data-deal-field="pmiAnnualRatePct">
          <NumberField
            label="PMI rate"
            suffix="%"
            min={0}
            step={0.05}
            value={scenario.pmiAnnualRatePct}
            onValueChange={(value) => onChange({ pmiAnnualRatePct: value })}
            description="Applies only while the loan balance is above 80% of the home price."
            error={errorFor(errors, 'pmiAnnualRatePct')}
            scrub={scrub ? { field: 'pmiAnnualRatePct' } : undefined}
          />
        </div>
        <div data-deal-field="monthlyHoa">
          <NumberField
            label="Monthly HOA fee"
            variant="currency"
            min={0}
            value={scenario.monthlyHoa}
            onValueChange={(value) => onChange({ monthlyHoa: value })}
            error={errorFor(errors, 'monthlyHoa')}
            scrub={scrub ? { field: 'monthlyHoa' } : undefined}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <DerivedRow
          label="Principal & interest only"
          value={currency.format(monthlyPrincipalAndInterest)}
        />
        <DerivedRow
          strong
          data-testid="total-monthly-payment"
          label="Total estimated monthly payment"
          value={currency.format(totalMonthlyPayment)}
        />
        {pmiDropPeriod != null ? (
          <p className="m-0 text-[12.5px] text-muted">
            PMI drops off automatically at payment #{pmiDropPeriod}, once equity
            reaches 20%.
          </p>
        ) : null}
      </div>
    </div>
  );
}
