'use client';

import { Checkbox, CheckboxIndicator } from '@ui-sdk/react/checkbox';
import {
  addUnit,
  hasOwnerUnit,
  MAX_UNITS,
  normalizeUnits,
  rentRollIncome,
  rentRollTotal,
  removeUnit,
  setOwnerUnit,
  updateUnit,
  type FieldError,
  type RentalAssumptions,
  type RentUnit,
} from 'shared-calculations';
import type { RentalPatch } from 'shared-data-access';
import { Button } from './ds/button';
import { currency } from './formatters';
import { NumberField } from './number-field';

export interface RentRollEditorProps {
  rental: RentalAssumptions | null;
  /** `rental.units*` errors. */
  errors: FieldError[];
  /**
   * The edited rental. A whole rental with `units` and a resynced `grossMonthlyRent`, or, for the
   * first rent on a scenario without rental analysis, `{ grossMonthlyRent }` to seed defaults.
   */
  onChange: (next: RentalPatch) => void;
}

const errorAt = (errors: FieldError[], index: number, field: string) =>
  errors.find((e) => e.field === `rental.units.${index}.${field}`)?.message;

/**
 * The rent roll (spec 012 US1, contracts/ui.md). A plain single unit keeps the familiar "Monthly
 * rent" field, so single-family deals look as before; "+ Add unit" turns it into one card per
 * unit (name, rent, beds, baths), up to 4. Every edit goes through the pure rent-roll edits, which
 * keep `grossMonthlyRent` equal to the total (research R1).
 */
export function RentRollEditor({
  rental,
  errors,
  onChange,
}: RentRollEditorProps) {
  const units = rental ? normalizeUnits(rental) : [];
  const owner = rental ? hasOwnerUnit(rental) : false;
  // Cards for 2+ units, or for one unit the owner lives in (spec 012 US3).
  const multi = units.length >= 2 || owner;
  const atMax = units.length >= MAX_UNITS;
  const rollError = errors.find((e) => e.field === 'rental.units')?.message;

  const addButton = (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="ghost"
        size="sm"
        data-testid="add-unit"
        disabled={rental == null || atMax}
        onClick={() => onChange((r) => addUnit(r))}
      >
        + Add unit
      </Button>
      {atMax ? (
        <p className="m-0 text-[12.5px] text-muted">
          Rent rolls cover 1–4 unit homes.
        </p>
      ) : null}
    </div>
  );

  if (!multi) {
    const unit = units[0] as RentUnit | undefined;
    return (
      <div
        data-testid="rent-roll"
        data-deal-field="rental.grossMonthlyRent"
        className="flex flex-col gap-2"
      >
        <NumberField
          label="Monthly rent"
          variant="currency"
          min={0}
          value={rental?.grossMonthlyRent ?? null}
          onValueChange={(value) => {
            if (rental == null) {
              if (value != null) onChange({ grossMonthlyRent: value });
              return;
            }
            onChange(
              rental.units?.length && unit
                ? (r) => updateUnit(r, unit.id, { rent: value ?? 0 })
                : { grossMonthlyRent: value ?? 0 },
            );
          }}
          error={
            errors.find((e) => e.field === 'rental.grossMonthlyRent')
              ?.message ?? errorAt(errors, 0, 'rent')
          }
        />
        {rental != null && unit ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            {addButton}
            <OwnerCheckbox
              checked={false}
              onChange={() => onChange((r) => setOwnerUnit(r, unit.id))}
            />
          </div>
        ) : null}
      </div>
    );
  }

  const total = rental ? rentRollTotal(rental) : 0;
  const living =
    rental && owner ? rentRollIncome(rental, 'living').rentMonthly : 0;

  return (
    <div
      data-testid="rent-roll"
      data-deal-field="rental.grossMonthlyRent"
      className="flex flex-col gap-3"
    >
      <ul
        aria-label="Rent roll"
        className="m-0 flex list-none flex-col gap-3 p-0"
      >
        {units.map((unit, index) => (
          <li key={unit.id}>
            <UnitCard
              unit={unit}
              index={index}
              errors={errors}
              overallVacancy={rental?.vacancyPct ?? 0}
              onUpdate={(patch) =>
                onChange((r) => updateUnit(r, unit.id, patch))
              }
              canRemove={units.length > 1}
              onOwnerChange={(mine) =>
                onChange((r) => setOwnerUnit(r, mine ? unit.id : null))
              }
              onRemove={() => onChange((r) => removeUnit(r, unit.id))}
            />
          </li>
        ))}
      </ul>
      {rollError ? (
        <p role="alert" className="m-0 text-[12.5px] font-medium text-bad">
          {rollError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {addButton}
        <p
          data-testid="rent-roll-total"
          className="num m-0 text-right text-[14px] text-fg"
        >
          Total rent{' '}
          <span className="font-semibold">{currency.format(total)}/mo</span>
          {owner ? (
            <span className="block text-[12.5px] text-muted">
              while living there {currency.format(living)}/mo
            </span>
          ) : null}
        </p>
      </div>
      {owner && rental ? (
        <div className="max-w-60">
          <NumberField
            label="Move out after (years)"
            min={1}
            max={30}
            step={1}
            value={rental.moveOutYears ?? 1}
            onValueChange={(value) =>
              onChange((r) => (r ? { ...r, moveOutYears: value ?? 1 } : r))
            }
            description="Projections switch to the full rent after this."
            error={
              errors.find((e) => e.field === 'rental.moveOutYears')?.message
            }
          />
        </div>
      ) : null}
    </div>
  );
}

type UnitPatch = Parameters<typeof updateUnit>[2];

function UnitCard({
  unit,
  index,
  errors,
  overallVacancy,
  onUpdate,
  onRemove,
  onOwnerChange,
  canRemove,
}: {
  unit: RentUnit;
  index: number;
  errors: FieldError[];
  overallVacancy: number;
  onOwnerChange: (mine: boolean) => void;
  canRemove: boolean;
  onUpdate: (patch: UnitPatch) => void;
  onRemove: () => void;
}) {
  const nameId = `unit-${unit.id}-name`;
  const nameError = errorAt(errors, index, 'name');
  const groupName = unit.name.trim() || `Unit ${index + 1}`;
  return (
    <div
      role="group"
      aria-label={groupName}
      data-testid="rent-unit"
      className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-sunk p-3"
    >
      <div className="col-span-2 flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor={nameId} className="text-label font-medium text-muted">
            Name
          </label>
          <input
            id={nameId}
            type="text"
            maxLength={40}
            value={unit.name}
            aria-invalid={nameError ? true : undefined}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="h-[var(--control-h)] w-full rounded-sm border border-line bg-surface px-3 text-[15px] text-fg focus:border-accent focus:outline-2 focus:outline-offset-1 focus:outline-accent aria-[invalid=true]:border-bad"
          />
          {nameError ? (
            <p className="m-0 text-[12.5px] font-medium text-bad">
              {nameError}
            </p>
          ) : null}
        </div>
        {canRemove ? (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Remove ${groupName}`}
            onClick={onRemove}
          >
            Remove
          </Button>
        ) : null}
      </div>
      <div className="col-span-2">
        <OwnerCheckbox checked={unit.ownerOccupied} onChange={onOwnerChange} />
      </div>
      <div className="col-span-2">
        {unit.ownerOccupied ? (
          <>
            <NumberField
              label="Rent after move-out"
              variant="currency"
              min={0}
              value={unit.rentAfterMoveOut}
              onValueChange={(value) => onUpdate({ rentAfterMoveOut: value })}
              error={errorAt(errors, index, 'rentAfterMoveOut')}
            />
            <p className="m-0 mt-1.5 text-[12.5px] text-muted">
              Rent while you live here: $0
            </p>
          </>
        ) : (
          <NumberField
            label="Rent"
            variant="currency"
            min={0}
            value={unit.rent}
            onValueChange={(value) => onUpdate({ rent: value ?? 0 })}
            error={errorAt(errors, index, 'rent')}
          />
        )}
      </div>
      <NumberField
        label="Beds"
        min={0}
        max={10}
        step={1}
        value={unit.bedrooms}
        onValueChange={(value) => onUpdate({ bedrooms: value })}
      />
      <NumberField
        label="Baths"
        min={0}
        max={10}
        step={0.5}
        value={unit.bathrooms}
        onValueChange={(value) => onUpdate({ bathrooms: value })}
      />
      {/* Per-unit vacancy (spec 012 US2): empty = the deal's overall rate. Not clamped with
          `max`, so an out-of-range value shows the validation message (as the rental panel). */}
      <div className="col-span-2">
        <NumberField
          label="Vacancy"
          suffix="%"
          min={0}
          step={0.5}
          value={unit.vacancyPct}
          onValueChange={(value) => onUpdate({ vacancyPct: value })}
          description={
            unit.vacancyPct == null
              ? `Empty uses the overall ${overallVacancy}%.`
              : undefined
          }
          error={errorAt(errors, index, 'vacancyPct')}
        />
      </div>
    </div>
  );
}

/** "I live here" (spec 012 FR-011): a ui-sdk checkbox, named by its label (Constitution IV). */
function OwnerCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-2 text-[14px] text-fg">
      <Checkbox
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
        className="flex size-[18px] shrink-0 items-center justify-center rounded-xs border border-line bg-surface focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent data-[checked]:border-ink data-[checked]:bg-ink"
      >
        <CheckboxIndicator className="text-[12px] leading-none text-ink-fg">
          ✓
        </CheckboxIndicator>
      </Checkbox>
      I live here
    </label>
  );
}
