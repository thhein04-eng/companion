'use client';

import { Button } from '@ui-sdk/react/button';
import { resolveWealthAssumptions } from 'deal-analyzer-calculations';
import type {
  FieldError,
  RentalAssumptions,
  WealthAssumptions,
} from 'shared-calculations';
import { NumberField } from 'shared-ui';
import { SegmentedOptions } from './segmented-options';
import type { GrowthPatch } from './use-wealth-editor';

export interface WealthAssumptionsPanelProps {
  rental: RentalAssumptions;
  /** `rental.wealth.*` and `rental.*` (growth) errors. */
  errors: FieldError[];
  onWealthChange: (patch: Partial<WealthAssumptions>) => void;
  onGrowthChange: (patch: GrowthPatch) => void;
  onTypicalRates: () => void;
}

const HORIZON_PRESETS = [
  { value: '5', label: '5 yrs' },
  { value: '10', label: '10 yrs' },
] as const;

/**
 * Projection horizon, growth, equity and tax drivers (spec 008 FR-002/003/013/014).
 * No field passes `min`/`max`: the SDK clamps on commit, which would hide the
 * range errors (same rule as the rental inputs).
 */
export function WealthAssumptionsPanel({
  rental,
  errors,
  onWealthChange,
  onGrowthChange,
  onTypicalRates,
}: WealthAssumptionsPanelProps) {
  const errorFor = (field: string) =>
    errors.find((e) => e.field === `rental.${field}`)?.message;
  // Show what is typed (even invalid) so the inline error stays next to it.
  const resolved = resolveWealthAssumptions(rental);
  const horizon = resolved.horizonYears;
  const preset =
    HORIZON_PRESETS.find((p) => Number(p.value) === horizon)?.value ?? null;
  const wealthNumber =
    (field: keyof WealthAssumptions) => (value: number | null) => {
      if (value != null) onWealthChange({ [field]: value });
    };
  const growth = (field: keyof GrowthPatch) => (value: number | null) =>
    onGrowthChange({ [field]: value ?? 0 });

  return (
    <div
      data-testid="wealth-assumptions"
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-[18px]"
    >
      <div className="flex flex-col gap-2">
        <h3 className="eyebrow m-0">Horizon</h3>
        <div className="flex flex-wrap items-end gap-4">
          <SegmentedOptions
            label="Projection horizon"
            value={preset}
            options={HORIZON_PRESETS}
            onValueChange={(v) => onWealthChange({ horizonYears: Number(v) })}
            data-testid="wealth-horizon-presets"
          />
          <div className="w-40">
            <NumberField
              label="Horizon (years)"
              step={1}
              value={horizon}
              onValueChange={wealthNumber('horizonYears')}
              error={errorFor('wealth.horizonYears')}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="eyebrow m-0">Growth</h3>
          <Button
            data-testid="wealth-typical-rates"
            onClick={onTypicalRates}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg hover:bg-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Use typical rates (3% / 2.5% / 2.5%)
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-2">
          <NumberField
            label="Appreciation"
            suffix="%"
            step={0.1}
            description="per year"
            value={rental.appreciationPct ?? 0}
            onValueChange={growth('appreciationPct')}
            error={errorFor('appreciationPct')}
          />
          <NumberField
            label="Rent growth"
            suffix="%"
            step={0.1}
            description="per year"
            value={rental.rentGrowthPct ?? 0}
            onValueChange={growth('rentGrowthPct')}
            error={errorFor('rentGrowthPct')}
          />
          <NumberField
            label="Expense growth"
            suffix="%"
            step={0.1}
            description="per year"
            value={rental.expenseGrowthPct ?? 0}
            onValueChange={growth('expenseGrowthPct')}
            error={errorFor('expenseGrowthPct')}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <h3 className="eyebrow m-0">Equity</h3>
        <div className="grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-2">
          <NumberField
            label="Forced appreciation"
            variant="currency"
            description="Value added at purchase, e.g. after-repair value − price"
            value={resolved.forcedAppreciation}
            onValueChange={wealthNumber('forcedAppreciation')}
            error={errorFor('wealth.forcedAppreciation')}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <h3 className="eyebrow m-0">Tax</h3>
        <div className="grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-2">
          <NumberField
            label="Land value share"
            suffix="%"
            step={1}
            description="Land doesn't depreciate"
            value={resolved.landValuePct}
            onValueChange={wealthNumber('landValuePct')}
            error={errorFor('wealth.landValuePct')}
          />
          <NumberField
            label="Marginal tax rate"
            suffix="%"
            step={1}
            value={resolved.marginalTaxRatePct}
            onValueChange={wealthNumber('marginalTaxRatePct')}
            error={errorFor('wealth.marginalTaxRatePct')}
          />
        </div>
      </div>
    </div>
  );
}
