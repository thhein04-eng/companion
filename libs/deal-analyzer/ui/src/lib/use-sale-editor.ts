'use client';

import { useCallback } from 'react';
import type { SaleAssumptions, SaleTaxAssumptions } from 'shared-calculations';
import { useDealEdits, useScenarios } from 'shared-data-access';
import type { GrowthPatch } from './use-wealth-editor';

/**
 * Edits the Sale Profit & Exit Analyzer inputs (spec 013 R1, R10). With a rental, appreciation,
 * selling costs, growth and land share write the shared rental fields, so `/pro-forma` and
 * `/wealth` agree; everything else (and a non-rental's appreciation and selling costs) writes
 * `scenario.sale`. Every write goes through `useDealEdits`, so it is recorded for undo.
 */
export function useSaleEditor() {
  const { activeScenario } = useScenarios();
  const { editRental, editSale } = useDealEdits();
  const rental = activeScenario.rental ?? null;
  const sale = activeScenario.sale ?? null;

  const setSale = useCallback(
    (patch: Partial<SaleAssumptions>) => editSale(patch, 'sheet'),
    [editSale],
  );
  const setExitMonth = useCallback(
    (exitMonth: number) => setSale({ exitMonth }),
    [setSale],
  );
  const setExitUnit = useCallback(
    (exitUnit: 'years' | 'months') => setSale({ exitUnit }),
    [setSale],
  );
  const setAppreciation = useCallback(
    (appreciationPct: number) =>
      rental
        ? editRental({ appreciationPct }, 'sheet')
        : setSale({ appreciationPct }),
    [rental, editRental, setSale],
  );
  const setSellingCosts = useCallback(
    (sellingCostsPct: number) =>
      rental
        ? editRental({ exit: { ...rental.exit, sellingCostsPct } }, 'sheet')
        : setSale({ sellingCostsPct }),
    [rental, editRental, setSale],
  );
  const setGrowth = useCallback(
    (patch: GrowthPatch) => editRental(patch, 'sheet'),
    [editRental],
  );
  const setTax = useCallback(
    (patch: Partial<SaleTaxAssumptions>) =>
      setSale({ tax: { ...sale?.tax, ...patch } }),
    [sale?.tax, setSale],
  );
  const setLandShare = useCallback(
    (landValuePct: number) =>
      editRental({ wealth: { ...rental?.wealth, landValuePct } }, 'sheet'),
    [rental?.wealth, editRental],
  );

  return {
    setExitMonth,
    setExitUnit,
    setAppreciation,
    setSellingCosts,
    setGrowth,
    setTax,
    setLandShare,
  };
}
