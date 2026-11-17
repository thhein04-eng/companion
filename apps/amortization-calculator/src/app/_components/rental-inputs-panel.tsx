'use client';

import type { FieldError, RentalAssumptions } from 'amortization-calculations';
import { NumberField } from 'amortization-ui';

export interface RentalInputsPanelProps {
  rental: RentalAssumptions | null;
  /** `rental.*` errors only. */
  errors: FieldError[];
  /** A partial patch edits the assumptions; `null` removes rental analysis. */
  onChange: (patch: Partial<RentalAssumptions> | null) => void;
  /** Down payment + closing costs + rehab, when an analysis is available. */
  totalCashInvested?: number | null;
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

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
}: RentalInputsPanelProps) {
  const rentField = (
    <NumberField
      label="Monthly rent"
      variant="currency"
      min={0}
      value={rental?.grossMonthlyRent ?? null}
      onValueChange={(value) => {
        if (rental == null && value == null) return;
        onChange({ grossMonthlyRent: value ?? 0 });
      }}
      error={errorFor(errors, 'grossMonthlyRent')}
    />
  );

  if (rental == null) {
    return (
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{rentField}</div>
        <p className="text-sm text-neutral-500">
          Enter rent to analyze this as a rental.
        </p>
      </div>
    );
  }

  // Percentages are deliberately not clamped with `max`, so an out-of-range
  // value surfaces the field-level validation message (FR-015) instead of
  // being silently corrected.
  const percentField = (field: keyof RentalAssumptions, label: string) => (
    <NumberField
      label={label}
      suffix="%"
      min={0}
      step={0.5}
      value={rental[field] as number}
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
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rentField}
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

      {/* Custom Operating Expenses Sub-Section */}
      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-neutral-800">
            Custom operating expenses
          </h3>
          <button
            type="button"
            onClick={() =>
              handleCustomExpensesChange([
                ...customExpenses,
                { id: Date.now().toString(), label: '', monthlyAmount: 0 },
              ])
            }
            className="text-xs font-medium text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
          >
            + Add expense
          </button>
        </div>

        {customExpenses.length > 0 ? (
          <div className="flex flex-col gap-2">
            {customExpenses.map((item, index) => (
              <div key={item.id ?? index} className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-neutral-500 mb-1">
                    Expense name
                  </label>
                  <input
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
                    className="h-9 w-full rounded-md border border-neutral-300 px-3 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
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
                  className="h-9 px-2 text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400 italic">
            No custom utility or service expenses added.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-neutral-800">
            Cash invested
          </h3>
          {totalCashInvested != null ? (
            <span
              data-testid="total-cash-invested"
              className="text-sm tabular-nums text-neutral-700"
            >
              Total {currency.format(totalCashInvested)} (incl. down payment)
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      <p className="text-xs text-neutral-500">
        Percentages are of gross scheduled income. Property tax, insurance, and
        HOA come from Real-estate costs above.
      </p>
      <div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-800"
        >
          Remove rental analysis
        </button>
      </div>
    </div>
  );
}
