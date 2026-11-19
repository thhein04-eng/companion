'use client';

import { useCallback, useMemo } from 'react';
import {
  addUnit,
  removeUnit,
  setOwnerUnit,
  updateCustomExpense,
  updateUnit,
  type CustomExpenseItem,
  type OccupancyView,
  type RentalAssumptions,
  type RentUnit,
} from 'shared-calculations';
import { useDealEdits, type DealEditSource } from './deal-edits-provider';
import { useScenarios } from './scenarios-provider';

type UnitPatch = Partial<
  Pick<
    RentUnit,
    | 'name'
    | 'bedrooms'
    | 'bathrooms'
    | 'rent'
    | 'vacancyPct'
    | 'rentAfterMoveOut'
  >
>;

/**
 * Rent roll, house-hack and RUBS edits for the active scenario (spec 012 T013). Every edit goes
 * through `editRental`, so it is recorded, coalesced and undoable (spec 010 US6) and keeps
 * `grossMonthlyRent` in sync with the units. Switching the income view is a display choice: it is
 * saved with the scenario but makes no undo entry or change toast (research R4).
 */
export function useRentRoll(source: DealEditSource = 'sheet') {
  const { activeScenario, updateActiveScenario } = useScenarios();
  const { editRental } = useDealEdits();
  const rental = activeScenario.rental ?? null;

  // Updaters, so each edit builds on the latest rental (see `editRental`).
  const commit = useCallback(
    (next: (rental: RentalAssumptions | null) => RentalAssumptions | null) =>
      editRental(next, source),
    [editRental, source],
  );

  const setOccupancyView = useCallback(
    (occupancyView: OccupancyView) => {
      if (rental == null) return;
      updateActiveScenario({ rental: { ...rental, occupancyView } });
    },
    [rental, updateActiveScenario],
  );

  return useMemo(
    () => ({
      addUnit: () => commit((r) => addUnit(r)),
      removeUnit: (id: string) => commit((r) => removeUnit(r, id)),
      updateUnit: (id: string, patch: UnitPatch) =>
        commit((r) => updateUnit(r, id, patch)),
      setOwnerUnit: (id: string | null) => commit((r) => setOwnerUnit(r, id)),
      setMoveOutYears: (moveOutYears: number) =>
        commit((r) => (r == null ? null : { ...r, moveOutYears })),
      updateCustomExpense: (
        index: number,
        patch: Partial<Pick<CustomExpenseItem, 'paidBy' | 'recoveryPct'>>,
      ) =>
        commit((r) =>
          r == null ? null : updateCustomExpense(r, index, patch),
        ),
      setOccupancyView,
    }),
    [commit, setOccupancyView],
  );
}
