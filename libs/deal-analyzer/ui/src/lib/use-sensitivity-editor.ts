'use client';

import { useCallback, useMemo } from 'react';
import {
  DEFAULT_SENSITIVITY,
  resolveTarget,
  type SensitivityMeasure,
  type SensitivityTarget,
} from 'deal-analyzer-calculations';
import { useScenarios } from 'shared-data-access';

/**
 * The Sensitivity page's Max Allowable Offer target (spec 015 research R7). It is saved on the
 * scenario's rental (`rental.sensitivity`) and written straight to the store: it's a page setting,
 * not a deal input, so it makes no undo entry and no change toast (like the occupancy view of
 * spec 012). Each measure keeps its own value; the measure starts as the grid's until one is saved.
 */
export function useSensitivityEditor(gridMeasure: SensitivityMeasure) {
  const { activeScenario, updateActiveScenario } = useScenarios();
  const rental = activeScenario.rental ?? null;

  const target = useMemo<SensitivityTarget & { isSet: boolean }>(
    () =>
      rental
        ? resolveTarget(rental, gridMeasure)
        : {
            measure: gridMeasure,
            value:
              gridMeasure === 'cashOnCash'
                ? DEFAULT_SENSITIVITY.cashOnCashPct
                : DEFAULT_SENSITIVITY.cashFlowMonthly,
            isSet: false,
          },
    [rental, gridMeasure],
  );

  const save = useCallback(
    (patch: NonNullable<NonNullable<typeof rental>['sensitivity']>) => {
      if (!rental) return;
      updateActiveScenario({
        rental: { ...rental, sensitivity: { ...rental.sensitivity, ...patch } },
      });
    },
    [rental, updateActiveScenario],
  );

  /** Chooses the target's measure; its value is whatever that measure last had, or its default. */
  const setMeasure = useCallback(
    (targetMeasure: SensitivityMeasure) => save({ targetMeasure }),
    [save],
  );

  /** Sets the value of the current measure. A cleared field (null) keeps the previous value. */
  const setValue = useCallback(
    (value: number | null) => {
      if (value == null) return;
      save(
        target.measure === 'cashOnCash'
          ? { targetMeasure: target.measure, cashOnCashPct: value }
          : { targetMeasure: target.measure, cashFlowMonthly: value },
      );
    },
    [save, target.measure],
  );

  return { target, setMeasure, setValue };
}
