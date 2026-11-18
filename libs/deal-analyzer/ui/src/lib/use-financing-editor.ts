'use client';

import { useCallback } from 'react';
import { resolveFinancingTerms } from 'deal-analyzer-calculations';
import type {
  ArmTerms,
  FinancingOptionId,
  FinancingTerms,
} from 'shared-calculations';
import { useScenarios } from 'shared-data-access';
import { useRentalEditor } from './use-rental-editor';

/**
 * Edits the active scenario's DSCR minimum and financing-matrix state
 * (spec 006). All writes go to `activeScenario.rental` through the shared
 * scenario store, so they persist for the session (FR-013).
 */
export function useFinancingEditor() {
  const { activeScenario } = useScenarios();
  const { updateActiveRental } = useRentalEditor();

  const setDscrMinimum = useCallback(
    (value: number) => updateActiveRental({ dscrMinimum: value }),
    [updateActiveRental],
  );

  const setSelection = useCallback(
    (id: FinancingOptionId) => updateActiveRental({ financingSelection: id }),
    [updateActiveRental],
  );

  /**
   * The first edit materializes the derived terms, detaching all three
   * structures from the loan inputs (FR-012, research R7). The full
   * `FinancingTerms` is always written: `applyScenarioPatch` merges `rental`
   * only one level deep.
   */
  const patchTerms = useCallback(
    (id: FinancingOptionId, patch: Partial<ArmTerms>) => {
      if (activeScenario.homePrice == null || activeScenario.homePrice <= 0) {
        return;
      }
      const { terms } = resolveFinancingTerms(activeScenario);
      const next = {
        ...terms,
        [id]: { ...terms[id], ...patch },
      } as FinancingTerms;
      updateActiveRental({ financing: next });
    },
    [activeScenario, updateActiveRental],
  );

  /** Back to derived terms; keeps the minimum DSCR and the selection. */
  const resetTerms = useCallback(
    () => updateActiveRental({ financing: null }),
    [updateActiveRental],
  );

  return { setDscrMinimum, setSelection, patchTerms, resetTerms };
}
