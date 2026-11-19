'use client';

import { useCallback } from 'react';
import { EXAMPLE_GROWTH } from 'deal-analyzer-calculations';
import type { ExitAssumptions, WealthAssumptions } from 'shared-calculations';
import { useDealEdits, useScenarios } from 'shared-data-access';
import type { GrowthPatch } from './use-wealth-editor';

/**
 * Edits the hold & exit assumptions (spec 009 T015), plus the shared growth rates and the
 * shared tax inputs (`rental.wealth`, also used by Wealth Projection). Writes go through
 * `useDealEdits().editRental` so they are recorded for undo (spec 010 R7).
 */
export function useExitEditor() {
  const { activeScenario } = useScenarios();
  const { editRental } = useDealEdits();
  const rental = activeScenario.rental;

  /** Always the full object: `applyScenarioPatch` merges `rental` one level deep. */
  const setExit = useCallback(
    (patch: Partial<ExitAssumptions>) =>
      editRental({ exit: { ...rental?.exit, ...patch } }, 'sheet'),
    [rental?.exit, editRental],
  );
  const setGrowth = useCallback(
    (patch: GrowthPatch) => editRental(patch, 'sheet'),
    [editRental],
  );
  const applyExampleRates = useCallback(
    () => editRental({ ...EXAMPLE_GROWTH }, 'sheet'),
    [editRental],
  );
  const setTax = useCallback(
    (patch: Pick<WealthAssumptions, 'landValuePct' | 'marginalTaxRatePct'>) =>
      editRental({ wealth: { ...rental?.wealth, ...patch } }, 'sheet'),
    [rental?.wealth, editRental],
  );

  return { setExit, setGrowth, applyExampleRates, setTax };
}
