'use client';

import type { ResolvedSaleAssumptions } from 'deal-analyzer-calculations';
import type {
  FieldError,
  RentalAssumptions,
  SaleTaxAssumptions,
} from 'shared-calculations';
import { NumberField } from 'shared-ui';
import { SegmentedOptions } from './segmented-options';
import type { GrowthPatch } from './use-wealth-editor';

export const TAX_DISCLAIMER = 'Illustrative planning estimate — not tax advice.';

export interface SaleAssumptionsPanelProps {
  assumptions: ResolvedSaleAssumptions;
  /** Present for a rental scenario (growth inputs, shared fields). */
  rental: RentalAssumptions | null;
  /** `sale.*` plus the relevant `rental.*` errors, keyed by field. */
  errors: FieldError[];
  onExitMonthChange: (months: number) => void;
  onExitUnitChange: (unit: 'years' | 'months') => void;
  onAppreciationChange: (pct: number) => void;
  onSellingCostsChange: (pct: number) => void;
  onGrowthChange: (patch: GrowthPatch) => void;
  onTaxChange: (patch: Partial<SaleTaxAssumptions>) => void;
  onLandShareChange: (pct: number) => void;
}

const UNITS = [
  { value: 'years', label: 'Years' },
  { value: 'months', label: 'Months' },
];
const TAX_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' },
];

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

const gridClass = 'grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-2';

/** Years shown with at most 2 decimals (90 months → 7.5). */
const toYears = (months: number) => Math.round((months / 12) * 100) / 100;

/**
 * Exit timing, sale, growth and tax inputs (spec 013 contracts § SaleAssumptionsPanel). No field
 * passes `min`/`max`: the SDK clamps on commit, which would hide the inline range errors.
 */
export function SaleAssumptionsPanel({
  assumptions: a,
  rental,
  errors,
  onExitMonthChange,
  onExitUnitChange,
  onAppreciationChange,
  onSellingCostsChange,
  onGrowthChange,
  onTaxChange,
  onLandShareChange,
}: SaleAssumptionsPanelProps) {
  const errorFor = (field: string) =>
    errors.find((e) => e.field === field)?.message;
  const years = a.exitUnit === 'years';
  const shared = rental ? ' Shared with Hold & Exit.' : '';
  const growth = (field: keyof GrowthPatch) => (value: number | null) =>
    onGrowthChange({ [field]: value ?? 0 });

  return (
    <div
      data-testid="sale-assumptions"
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-[18px]"
    >
      <Group title="Exit timing">
        <div className="flex flex-wrap items-end gap-[var(--space-grid)]">
          <SegmentedOptions
            label="Exit unit"
            data-testid="sale-exit-unit"
            value={a.exitUnit}
            options={UNITS}
            onValueChange={(v) => onExitUnitChange(v as 'years' | 'months')}
          />
          <div className="w-44" data-testid="sale-exit">
            <NumberField
              label="Sell after"
              suffix={years ? 'years' : 'months'}
              step={1}
              value={years ? toYears(a.exitMonth) : a.exitMonth}
              onValueChange={(v) => {
                if (v == null) return;
                onExitMonthChange(years ? Math.round(v * 12) : v);
              }}
              error={errorFor('sale.exitMonth')}
            />
          </div>
        </div>
        {a.clampedFrom != null ? (
          <p
            data-testid="sale-exit-clamped"
            className="m-0 text-small text-muted"
          >
            Sale moved to month {a.exitMonth}, the end of the loan term.
          </p>
        ) : null}
      </Group>

      <Group title="Sale">
        <div data-input-grid="" className={gridClass}>
          <NumberField
            label="Appreciation"
            suffix="%"
            step={0.1}
            value={a.appreciationPct}
            onValueChange={(v) => onAppreciationChange(v ?? 0)}
            description={`per year.${shared}`}
            error={errorFor(
              rental ? 'rental.appreciationPct' : 'sale.appreciationPct',
            )}
          />
          <NumberField
            label="Selling costs"
            suffix="%"
            step={0.5}
            value={a.sellingCostsPct}
            onValueChange={(v) => {
              if (v != null) onSellingCostsChange(v);
            }}
            description={`Agent commissions, closing/transfer costs and make-ready prep.${shared}`}
            error={errorFor(
              rental ? 'rental.exit.sellingCostsPct' : 'sale.sellingCostsPct',
            )}
          />
        </div>
      </Group>

      {rental ? (
        <Group title="Growth">
          <div data-input-grid="" className={gridClass}>
            <NumberField
              label="Rent growth"
              suffix="%"
              step={0.1}
              description="per year"
              value={rental.rentGrowthPct ?? 0}
              onValueChange={growth('rentGrowthPct')}
              error={errorFor('rental.rentGrowthPct')}
            />
            <NumberField
              label="Expense growth"
              suffix="%"
              step={0.1}
              description="per year"
              value={rental.expenseGrowthPct ?? 0}
              onValueChange={growth('expenseGrowthPct')}
              error={errorFor('rental.expenseGrowthPct')}
            />
          </div>
        </Group>
      ) : null}

      {/* US3 (T029): the tax-estimate toggle and its inputs. */}
      <Group title="Tax">
        <SegmentedOptions
          label="Estimate taxes on sale"
          data-testid="sale-tax-toggle"
          value={a.tax.enabled ? 'on' : 'off'}
          options={TAX_OPTIONS}
          onValueChange={(v) => onTaxChange({ enabled: v === 'on' })}
        />
        {a.tax.enabled ? (
          <>
            <p className="m-0 text-small text-muted">{TAX_DISCLAIMER}</p>
            <div data-input-grid="" className={gridClass}>
              <NumberField
                label="Capital gains rate"
                suffix="%"
                step={1}
                value={a.tax.capitalGainsRatePct}
                onValueChange={(v) => {
                  if (v != null) onTaxChange({ capitalGainsRatePct: v });
                }}
                error={errorFor('sale.tax.capitalGainsRatePct')}
              />
              {rental ? (
                <>
                  <NumberField
                    label="Depreciation recapture rate"
                    suffix="%"
                    step={1}
                    value={a.tax.recaptureRatePct}
                    onValueChange={(v) => {
                      if (v != null) onTaxChange({ recaptureRatePct: v });
                    }}
                    error={errorFor('sale.tax.recaptureRatePct')}
                  />
                  <NumberField
                    label="Land value share"
                    suffix="%"
                    step={1}
                    value={a.tax.landValuePct}
                    onValueChange={(v) => {
                      if (v != null) onLandShareChange(v);
                    }}
                    description="Land doesn't depreciate. Shared with Wealth Projection and Hold & Exit."
                    error={errorFor('rental.wealth.landValuePct')}
                  />
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </Group>
    </div>
  );
}
