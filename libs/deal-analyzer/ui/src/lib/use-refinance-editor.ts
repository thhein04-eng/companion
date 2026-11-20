'use client';

import { useCallback } from 'react';
import type { RefinanceAssumptions } from 'shared-calculations';
import { useDealEdits } from 'shared-data-access';

/**
 * Edits the Refinance & BRRRR Modeling inputs (spec 014 R1, R11). The refinance inputs write
 * `scenario.refinance`; rehab and purchase closing costs are the shared rental fields, so they
 * write through `editDeal` and `/deal-analyzer` agrees. Every write goes through `useDealEdits`,
 * so it is recorded for undo.
 */
export function useRefinanceEditor() {
  const { editDeal, editRefinance } = useDealEdits();

  const set = useCallback(
    (patch: Partial<RefinanceAssumptions>) => editRefinance(patch, 'sheet'),
    [editRefinance],
  );

  /** A cleared field (null) removes the stored value, so the default or the prompt applies. */
  const num = useCallback(
    (
      key:
        | 'arvDollars'
        | 'ltvPct'
        | 'newRatePct'
        | 'newTermMonths'
        | 'closingCostsDollars'
        | 'refinanceMonth',
    ) =>
      (value: number | null) =>
        set({ [key]: value ?? undefined }),
    [set],
  );

  return {
    setMode: useCallback(
      (mode: 'cash-out' | 'rate-drop') => set({ mode }),
      [set],
    ),
    setArv: num('arvDollars'),
    setLtv: num('ltvPct'),
    setNewRate: num('newRatePct'),
    setNewTerm: num('newTermMonths'),
    setTermUnit: useCallback(
      (termUnit: 'years' | 'months') => set({ termUnit }),
      [set],
    ),
    setClosingCosts: num('closingCostsDollars'),
    setRefinanceMonth: num('refinanceMonth'),
    /** Shared rental field, edited here because cash left depends on it (research R11). */
    setRehab: useCallback(
      (value: number | null) =>
        editDeal('rental.rehabBudget', value ?? 0, 'sheet'),
      [editDeal],
    ),
    /** Shared rental field: the purchase closing costs, not the refinance closing costs. */
    setPurchaseClosing: useCallback(
      (value: number | null) =>
        editDeal('rental.closingCosts', value ?? 0, 'sheet'),
      [editDeal],
    ),
  };
}

export type RefinanceEditor = ReturnType<typeof useRefinanceEditor>;
