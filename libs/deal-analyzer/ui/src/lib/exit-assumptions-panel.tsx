'use client';

import {
  HOLD_PRESETS,
  resolveExitAssumptions,
  resolveWealthAssumptions,
} from 'deal-analyzer-calculations';
import type {
  ExitAssumptions,
  FieldError,
  RentalAssumptions,
  WealthAssumptions,
} from 'shared-calculations';
import { Button, NumberField } from 'shared-ui';
import { SegmentedOptions } from './segmented-options';
import type { GrowthPatch } from './use-wealth-editor';

export interface ExitAssumptionsPanelProps {
  rental: RentalAssumptions;
  /** `rental.exit.*`, `rental.wealth.*` and growth errors. */
  errors: FieldError[];
  onExitChange: (patch: Partial<ExitAssumptions>) => void;
  onGrowthChange: (patch: GrowthPatch) => void;
  onExampleRates: () => void;
  onTaxChange: (
    patch: Pick<WealthAssumptions, 'landValuePct' | 'marginalTaxRatePct'>,
  ) => void;
}

const PRESETS = HOLD_PRESETS.map((n) => ({
  value: String(n),
  label: `${n} yrs`,
}));

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h3 className="eyebrow m-0">{title}</h3>
      {children}
    </div>
  );
}

/**
 * Hold, sale, growth and tax assumptions (spec 009 contracts § ExitAssumptionsPanel). No field
 * passes `min`/`max`: the SDK clamps on commit, which would hide the inline range errors.
 */
export function ExitAssumptionsPanel({
  rental,
  errors,
  onExitChange,
  onGrowthChange,
  onExampleRates,
  onTaxChange,
}: ExitAssumptionsPanelProps) {
  const errorFor = (field: string) =>
    errors.find((e) => e.field === `rental.${field}`)?.message;
  const exit = resolveExitAssumptions(rental);
  const wealth = resolveWealthAssumptions(rental);
  const preset =
    PRESETS.find((p) => Number(p.value) === exit.holdYears)?.value ?? null;
  const growth = (field: keyof GrowthPatch) => (value: number | null) =>
    onGrowthChange({ [field]: value ?? 0 });

  return (
    <div
      data-testid="exit-assumptions"
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-[18px]"
    >
      <Group title="Hold">
        <div className="flex flex-wrap items-end gap-[var(--space-grid)]">
          <SegmentedOptions
            label="Hold period"
            data-testid="hold-presets"
            value={preset}
            options={PRESETS}
            onValueChange={(v) => onExitChange({ holdYears: Number(v) })}
          />
          <div className="w-40">
            <NumberField
              label="Hold (years)"
              step={1}
              value={exit.holdYears}
              onValueChange={(v) => {
                if (v != null) onExitChange({ holdYears: v });
              }}
              error={errorFor('exit.holdYears')}
            />
          </div>
        </div>
      </Group>
      <Group title="Sale">
        <div
          data-input-grid=""
          className="grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-2"
        >
          <NumberField
            label="Selling costs"
            suffix="%"
            step={0.5}
            value={exit.sellingCostsPct}
            onValueChange={(v) => {
              if (v != null) onExitChange({ sellingCostsPct: v });
            }}
            description="Commissions, transfer taxes and closing"
            error={errorFor('exit.sellingCostsPct')}
          />
        </div>
      </Group>
      <Group title="Growth">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-small text-muted">Shared with every page.</span>
          <Button
            size="sm"
            data-testid="pro-forma-example-rates"
            onClick={onExampleRates}
          >
            Use example rates (3% / 2.5% / 3.5%)
          </Button>
        </div>
        <div
          data-input-grid=""
          className="grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-2"
        >
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
          <NumberField
            label="Appreciation"
            suffix="%"
            step={0.1}
            description="per year"
            value={rental.appreciationPct ?? 0}
            onValueChange={growth('appreciationPct')}
            error={errorFor('appreciationPct')}
          />
        </div>
      </Group>
      <Group title="Tax">
        <div
          data-input-grid=""
          className="grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-2"
        >
          <NumberField
            label="Land value share"
            suffix="%"
            step={1}
            value={wealth.landValuePct}
            onValueChange={(v) => {
              if (v != null) onTaxChange({ landValuePct: v });
            }}
            description="Land doesn't depreciate; shared with Wealth Projection"
            error={errorFor('wealth.landValuePct')}
          />
          <NumberField
            label="Marginal tax rate"
            suffix="%"
            step={1}
            value={wealth.marginalTaxRatePct}
            onValueChange={(v) => {
              if (v != null) onTaxChange({ marginalTaxRatePct: v });
            }}
            error={errorFor('wealth.marginalTaxRatePct')}
          />
        </div>
      </Group>
    </div>
  );
}
