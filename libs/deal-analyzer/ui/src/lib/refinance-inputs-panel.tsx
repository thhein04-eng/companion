'use client';

import type { ResolvedRefinanceAssumptions } from 'deal-analyzer-calculations';
import type {
  FieldError,
  RefinanceAssumptions,
  RentalAssumptions,
} from 'shared-calculations';
import { NumberField } from 'shared-ui';
import { SegmentedOptions } from './segmented-options';
import type { RefinanceEditor } from './use-refinance-editor';

export interface RefinanceInputsPanelProps {
  /** The stored values, so a field shows what was typed even when it is invalid. */
  stored: RefinanceAssumptions;
  /** The defaults and clamping, for fields that are not stored yet. */
  assumptions: ResolvedRefinanceAssumptions;
  /** Present for a rental scenario: rehab and purchase closing costs count toward cash invested. */
  rental: RentalAssumptions | null;
  /** `refinance.*` and `rental.*` errors, keyed by field. */
  errors: FieldError[];
  editor: RefinanceEditor;
}

const UNITS = [
  { value: 'years', label: 'Years' },
  { value: 'months', label: 'Months' },
];
const MODES = [
  { value: 'cash-out', label: 'Cash-out (BRRRR)' },
  { value: 'rate-drop', label: 'Rate drop' },
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

/** Years shown with at most 2 decimals (270 months → 22.5). */
const toYears = (months: number) => Math.round((months / 12) * 100) / 100;

/**
 * The refinance inputs (spec 014 contracts/refinance-ui.md § Inputs). No field passes `min`/`max`:
 * the SDK clamps on commit, which would hide the inline range errors.
 */
export function RefinanceInputsPanel({
  stored,
  assumptions: a,
  rental,
  errors,
  editor,
}: RefinanceInputsPanelProps) {
  const errorFor = (field: FieldError['field']) =>
    errors.find((e) => e.field === field)?.message;
  const years = a.termUnit === 'years';
  const termMonths = stored.newTermMonths ?? a.newTermMonths;
  const cashOut = a.mode === 'cash-out';

  return (
    <div
      data-testid="refinance-inputs"
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-[18px]"
    >
      <Group title="Mode">
        <SegmentedOptions
          label="Refinance mode"
          data-testid="refinance-mode"
          value={a.mode}
          options={MODES}
          onValueChange={(v) => editor.setMode(v as 'cash-out' | 'rate-drop')}
        />
      </Group>

      <Group title="Refinance">
        <div data-input-grid="" className={gridClass}>
          {cashOut ? (
            <>
              <NumberField
                label="After-repair value (ARV)"
                variant="currency"
                value={stored.arvDollars ?? null}
                onValueChange={editor.setArv}
                error={errorFor('refinance.arvDollars')}
              />
              <NumberField
                label="Refinance LTV"
                suffix="%"
                value={stored.ltvPct ?? a.ltvPct}
                onValueChange={editor.setLtv}
                error={errorFor('refinance.ltvPct')}
              />
            </>
          ) : null}
          <NumberField
            label="New interest rate"
            suffix="%"
            value={stored.newRatePct ?? null}
            onValueChange={editor.setNewRate}
            error={errorFor('refinance.newRatePct')}
          />
          <NumberField
            label="Refinance closing costs"
            variant="currency"
            value={stored.closingCostsDollars ?? a.closingCosts}
            onValueChange={editor.setClosingCosts}
            error={errorFor('refinance.closingCostsDollars')}
          />
        </div>
        <div className="flex flex-wrap items-end gap-[var(--space-grid)]">
          <SegmentedOptions
            label="New loan term unit"
            data-testid="refinance-term-unit"
            value={a.termUnit}
            options={UNITS}
            onValueChange={(v) => editor.setTermUnit(v as 'years' | 'months')}
          />
          <div className="w-44" data-testid="refinance-term">
            <NumberField
              label="New loan term"
              suffix={years ? 'years' : 'months'}
              value={years ? toYears(termMonths) : termMonths}
              onValueChange={(v) => {
                if (v == null) return editor.setNewTerm(null);
                editor.setNewTerm(years ? Math.round(v * 12) : v);
              }}
              error={errorFor('refinance.newTermMonths')}
            />
          </div>
          <div className="w-52" data-testid="refinance-month">
            <NumberField
              label="Refinance month (months after purchase)"
              value={stored.refinanceMonth ?? a.refinanceMonth}
              onValueChange={editor.setRefinanceMonth}
              error={errorFor('refinance.refinanceMonth')}
            />
          </div>
        </div>
        {a.clampedFrom != null ? (
          <p
            data-testid="refinance-clamped"
            className="m-0 text-small text-muted"
          >
            Refinance moved to month {a.refinanceMonth}, the end of the loan
            term.
          </p>
        ) : null}
      </Group>

      {cashOut ? (
        <Group title="Cash invested">
          {rental ? (
            <div data-input-grid="" className={gridClass}>
              <NumberField
                label="Rehab budget"
                variant="currency"
                value={rental.rehabBudget}
                onValueChange={editor.setRehab}
                error={errorFor('rental.rehabBudget')}
              />
              <NumberField
                label="Purchase closing costs"
                variant="currency"
                value={rental.closingCosts}
                onValueChange={editor.setPurchaseClosing}
                error={errorFor('rental.closingCosts')}
              />
            </div>
          ) : (
            <p
              data-testid="refinance-no-rental"
              className="m-0 text-small text-muted"
            >
              Add rent to include rehab and closing costs in cash invested.
            </p>
          )}
        </Group>
      ) : null}
    </div>
  );
}
