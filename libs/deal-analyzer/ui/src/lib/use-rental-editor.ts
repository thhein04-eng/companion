'use client';

import { useCallback } from 'react';
import { DEFAULT_RENTAL_ASSUMPTIONS } from 'deal-analyzer-calculations';
import type { RentalAssumptions } from 'shared-calculations';
import { useScenarios } from 'shared-data-access';

/**
 * Edits the active scenario's rental assumptions through the shared scenario
 * store. The first rent entry seeds the editable screening defaults
 * (spec 002 FR-002); `null` removes rental analysis.
 */
export function useRentalEditor() {
  const { activeScenario, updateActiveScenario } = useScenarios();
  const hasRental = activeScenario.rental != null;

  const updateActiveRental = useCallback(
    (patch: Partial<RentalAssumptions> | null) => {
      if (patch === null) {
        updateActiveScenario({ rental: null });
        return;
      }
      if (!hasRental) {
        if (patch.grossMonthlyRent == null) return;
        updateActiveScenario({
          rental: {
            ...DEFAULT_RENTAL_ASSUMPTIONS,
            grossMonthlyRent: patch.grossMonthlyRent,
            ...patch,
          },
        });
        return;
      }
      updateActiveScenario({ rental: patch as RentalAssumptions });
    },
    [hasRental, updateActiveScenario],
  );

  return { updateActiveRental };
}
