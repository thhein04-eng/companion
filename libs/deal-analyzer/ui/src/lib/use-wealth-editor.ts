'use client';

import { useCallback } from 'react';
import { TYPICAL_GROWTH } from 'deal-analyzer-calculations';
import type { RentalAssumptions, WealthAssumptions } from 'shared-calculations';
import { useScenarios, useRentalEditor } from 'shared-data-access';

export type GrowthPatch = Partial<
  Pick<
    RentalAssumptions,
    'appreciationPct' | 'rentGrowthPct' | 'expenseGrowthPct'
  >
>;

/**
 * Edits the active scenario's wealth assumptions and the shared growth rates
 * (spec 008). Writes go to `activeScenario.rental` through the shared store.
 */
export function useWealthEditor() {
  const { activeScenario } = useScenarios();
  const { updateActiveRental } = useRentalEditor();
  const stored = activeScenario.rental?.wealth;

  /** Always writes the full object: `applyScenarioPatch` merges `rental` one level deep. */
  const setWealth = useCallback(
    (patch: Partial<WealthAssumptions>) =>
      updateActiveRental({ wealth: { ...stored, ...patch } }),
    [stored, updateActiveRental],
  );

  const setGrowth = useCallback(
    (patch: GrowthPatch) => updateActiveRental(patch),
    [updateActiveRental],
  );

  const applyTypicalRates = useCallback(
    () => updateActiveRental({ ...TYPICAL_GROWTH }),
    [updateActiveRental],
  );

  return { setWealth, setGrowth, applyTypicalRates };
}
