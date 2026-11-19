'use client';

import {
  updateCustomExpense,
  type FieldError,
  type RentalAssumptions,
} from 'shared-calculations';
import { currency } from './formatters';
import { NumberField } from './number-field';
import type { RentalPatch } from 'shared-data-access';
import { RentRollEditor } from './rent-roll-editor';
import { SegmentedControl } from './ds/segmented-control';

const PAID_BY = [
  { value: 'landlord', label: 'Landlord' },
  { value: 'rubs', label: 'Tenants (RUBS)' },
] as const;

export interface RentalInputsPanelProps {
  rental: RentalAssumptions | null;
  /** `rental.*` errors only. */
  errors: FieldError[];
  /**
   * A partial patch edits the assumptions; `null` removes rental analysis. Rent-roll and "Paid by"
   * edits pass an updater of the latest rental (spec 012), so quick successive edits never build
   * on a stale copy.
   */
  onChange: (patch: RentalPatch) => void;
  /** Down payment + closing costs + rehab, when an analysis is available. */
  totalCashInvested?: number | null;
  /** Skip the growth group, e.g. when a page shows those inputs elsewhere (spec 008 `/wealth`). */
  hideGrowth?: boolean;
}

type PercentFieldKey =
  | 'vacancyPct'
  | 'managementPct'
  | 'maintenanceReservePct'
  | 'capexReservePct'
  | 'rentGrowthPct'
  | 'expenseGrowthPct'
  | 'appreciationPct';

function errorFor(
  errors: FieldError[],
  field: keyof RentalAssumptions,
): string | undefined {
  return errors.find((e) => e.field === `rental.${field}`)?.message;
}

/**
 * - Deal Analyzer inputs (FR-001, FR-002). Tax, insurance, and HOA are not
 * - repeated here; they come from the real-estate costs section (FR-003).
 */
export function RentalInputsPanel({
  rental,
  errors,
  onChange,
  totalCashInvested,
  hideGrowth = false,
}: RentalInputsPanelProps) {
  // The rent roll (spec 012 US1): one "Monthly rent" field for a plain single unit, unit cards
  // once there are two or more.
  const rentField = (
    <RentRollEditor
      rental={rental}
      errors={errors.filter(
        (e) =>
          e.field === 'rental.grossMonthlyRent' ||
          e.field.startsWith('rental.units'),
      )}
      onChange={onChange}
    />
  );

  if (rental == null) {
    return (
      <div className="flex flex-col gap-2">
        <div
          data-input-grid=""
          className="grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-2"
        >
          {/* Same wrapper as the full layout below, so the field keeps its identity (and focus)
              when the first keystroke creates the rental. */}
          <div className="sm:col-span-2">{rentField}</div>
        </div>
        <p className="m-0 text-small text-muted">
          Enter rent to analyze this as a rental.
        </p>
      </div>
    );
  }

  // Percentages are deliberately not clamped with `max`, so an out-of-range
  // value surfaces the field-level validation message (FR-015) instead of
  // being silently corrected. The growth fields also omit `min` (they accept
  // negatives): the SDK NumberInput clamps on commit, which would hide the
  // -10…25 validation error (spec 005 FR-013, research R14).
  const percentField = (
    field: PercentFieldKey,
    label: string,
    {
      min = 0,
      step = 0.5,
      description,
    }: { min?: number | null; step?: number; description?: string } = {},
  ) => (
    <NumberField
      label={label}
      suffix="%"
      min={min ?? undefined}
      step={step}
      description={description}
      value={rental[field] ?? 0}
      onValueChange={(value) => onChange({ [field]: value ?? 0 })}
      error={errorFor(errors, field)}
    />
  );

  const customExpenses = rental.customExpenses ?? [];

  const handleCustomExpensesChange = (
    updatedExpenses: typeof customExpenses,
  ) => {
    onChange({ customExpenses: updatedExpenses });
  };

  return (
    <div className="flex flex-col gap-[var(--space-card)]">
      <div
        data-input-grid=""
        className="grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-2"
      >
        <div className="sm:col-span-2">{rentField}</div>
        <NumberField
          label="Other monthly income"
          variant="currency"
          min={0}
          value={rental.otherMonthlyIncome}
          onValueChange={(value) =>
            onChange({ otherMonthlyIncome: value ?? 0 })
          }
          description="Parking, laundry, storage, and similar."
          error={errorFor(errors, 'otherMonthlyIncome')}
        />
        {percentField('vacancyPct', 'Vacancy rate')}
        {percentField('managementPct', 'Property management')}
        {percentField('maintenanceReservePct', 'Maintenance reserve')}
        {percentField('capexReservePct', 'CapEx reserve')}
      </div>

      {hideGrowth ? null : (
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <h4 className="eyebrow m-0">Growth assumptions</h4>
          <GrowthFields rental={rental} errors={errors} onChange={onChange} />
        </div>
      )}

      {/* Custom Operating Expenses Sub-Section */}
      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <div className="flex items-baseline justify-between">
          <h4 className="eyebrow m-0">Custom operating expenses</h4>
          <button
            type="button"
            onClick={() =>
              handleCustomExpensesChange([
                ...customExpenses,
                { id: Date.now().toString(), label: '', monthlyAmount: 0 },
              ])
            }
            className="cursor-pointer rounded-xs text-[13px] font-medium text-accent underline-offset-2 hover:underline"
          >
            + Add expense
          </button>
        </div>

        {customExpenses.length > 0 ? (
          <div className="flex flex-col gap-2">
            {customExpenses.map((item, index) => (
              <div
                key={item.id ?? index}
                data-testid="custom-expense"
                className="flex flex-col gap-2"
              >
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label
                      htmlFor={`custom-expense-${index}`}
                      className="mb-1.5 block text-label font-medium text-muted"
                    >
                      Expense name
                    </label>
                    <input
                      id={`custom-expense-${index}`}
                      type="text"
                      value={item.label}
                      onChange={(e) => {
                        const updated = [...customExpenses];
                        updated[index] = {
                          ...updated[index],
                          label: e.target.value,
                        };
                        handleCustomExpensesChange(updated);
                      }}
                      placeholder="e.g. Utilities, Water, Trash"
                      className="h-[38px] w-full rounded-sm border border-line bg-surface px-3 text-[15px] text-fg placeholder:text-muted focus:border-accent focus:outline-2 focus:outline-offset-1 focus:outline-accent"
                    />
                  </div>
                  <div className="w-36">
                    <NumberField
                      label="Monthly amount"
                      variant="currency"
                      min={0}
                      value={item.monthlyAmount}
                      error={
                        errors.find(
                          (e) =>
                            e.field ===
                            `rental.customExpenses.${index}.monthlyAmount`,
                        )?.message
                      }
                      onValueChange={(val) => {
                        const updated = [...customExpenses];
                        updated[index] = {
                          ...updated[index],
                          monthlyAmount: val ?? 0,
                        };
                        handleCustomExpensesChange(updated);
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = customExpenses.filter(
                        (_, i) => i !== index,
                      );
                      handleCustomExpensesChange(updated);
                    }}
                    className="h-9 cursor-pointer rounded-xs px-2 text-[13px] font-medium text-bad hover:bg-bad-soft"
                  >
                    Remove
                  </button>
                </div>
                {/* Who pays (spec 012 US4): RUBS bills a share back to the tenants as income. */}
                <div className="flex flex-wrap items-end gap-3">
                  <SegmentedControl
                    label="Paid by"
                    showLabel
                    value={item.paidBy ?? 'landlord'}
                    options={PAID_BY}
                    onValueChange={(paidBy) =>
                      onChange((r) =>
                        r ? updateCustomExpense(r, index, { paidBy }) : r,
                      )
                    }
                  />
                  {item.paidBy === 'rubs' ? (
                    <div className="w-36">
                      <NumberField
                        label="Recovered"
                        suffix="%"
                        min={0}
                        step={5}
                        value={item.recoveryPct ?? 100}
                        onValueChange={(recoveryPct) =>
                          onChange((r) =>
                            r
                              ? updateCustomExpense(r, index, {
                                  recoveryPct: recoveryPct ?? 100,
                                })
                              : r,
                          )
                        }
                        error={
                          errors.find(
                            (e) =>
                              e.field ===
                              `rental.customExpenses.${index}.recoveryPct`,
                          )?.message
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="m-0 text-small text-muted">
            No custom utility or service expenses added.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <div className="flex items-baseline justify-between">
          <h4 className="eyebrow m-0">Cash invested</h4>
          {totalCashInvested != null ? (
            <span
              data-testid="total-cash-invested"
              className="num text-small text-fg"
            >
              Total {currency.format(totalCashInvested)} (incl. down payment)
            </span>
          ) : null}
        </div>
        <div
          data-input-grid=""
          className="grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-2"
        >
          <NumberField
            label="Closing costs"
            variant="currency"
            min={0}
            value={rental.closingCosts}
            onValueChange={(value) => onChange({ closingCosts: value ?? 0 })}
            error={errorFor(errors, 'closingCosts')}
          />
          <NumberField
            label="Rehab budget"
            variant="currency"
            min={0}
            value={rental.rehabBudget}
            onValueChange={(value) => onChange({ rehabBudget: value ?? 0 })}
            error={errorFor(errors, 'rehabBudget')}
          />
        </div>
      </div>
      <p className="m-0 text-[12.5px] text-muted">
        Percentages are of gross scheduled income. Property tax, insurance, and
        HOA come from Monthly costs.
      </p>
      <div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="cursor-pointer self-start rounded-xs text-[13px] text-muted underline underline-offset-2 hover:text-bad"
        >
          Remove rental analysis
        </button>
      </div>
    </div>
  );
}

/**
 * The annual growth assumptions (spec 005 FR-013): rent, expense and appreciation growth.
 * Page-only inputs on the Deal Analyzer (its projection charts); the Wealth page has its own
 * assumptions panel. Growth fields accept negatives, so no `min` (research R14).
 */
export function GrowthFields({
  rental,
  errors,
  onChange,
}: {
  rental: RentalAssumptions;
  errors: FieldError[];
  onChange: (patch: Partial<RentalAssumptions>) => void;
}) {
  const field = (
    key: 'rentGrowthPct' | 'expenseGrowthPct' | 'appreciationPct',
    label: string,
  ) => (
    <NumberField
      label={label}
      suffix="%"
      step={0.1}
      description="per year"
      value={rental[key] ?? 0}
      onValueChange={(value) => onChange({ [key]: value ?? 0 })}
      error={errorFor(errors, key)}
    />
  );
  return (
    <div
      data-input-grid=""
      className="grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-2"
    >
      {field('rentGrowthPct', 'Rent growth')}
      {field('expenseGrowthPct', 'Expense growth')}
      {field('appreciationPct', 'Appreciation')}
    </div>
  );
}
