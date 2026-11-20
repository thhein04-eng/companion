import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  DealEditsProvider,
  ScenariosProvider,
  useScenarios,
} from 'shared-data-access';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRefinanceEditor } from './use-refinance-editor';
import { useDealEdits } from 'shared-data-access';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ScenariosProvider>
      <DealEditsProvider>{children}</DealEditsProvider>
    </ScenariosProvider>
  );
}

const useAll = () => ({
  editor: useRefinanceEditor(),
  store: useScenarios(),
  edits: useDealEdits(),
});

describe('useRefinanceEditor (spec 014 R1, R11)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('writes the refinance inputs to scenario.refinance', () => {
    const { result } = renderHook(useAll, { wrapper });
    act(() => result.current.editor.setMode('rate-drop'));
    act(() => result.current.editor.setArv(320_000));
    act(() => result.current.editor.setLtv(70));
    act(() => result.current.editor.setNewRate(6.5));
    act(() => result.current.editor.setNewTerm(360));
    act(() => result.current.editor.setTermUnit('months'));
    act(() => result.current.editor.setClosingCosts(5_000));
    act(() => result.current.editor.setRefinanceMonth(18));
    expect(result.current.store.activeScenario.refinance).toEqual({
      mode: 'rate-drop',
      arvDollars: 320_000,
      ltvPct: 70,
      newRatePct: 6.5,
      newTermMonths: 360,
      termUnit: 'months',
      closingCostsDollars: 5_000,
      refinanceMonth: 18,
    });
  });

  it('clearing a field removes the stored value, so the default or the prompt applies', () => {
    const { result } = renderHook(useAll, { wrapper });
    act(() => result.current.editor.setArv(320_000));
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.editor.setArv(null));
    expect(
      result.current.store.activeScenario.refinance?.arvDollars,
    ).toBeUndefined();
  });

  it('writes rehab and purchase closing costs to the shared rental fields, not to refinance', () => {
    const { result } = renderHook(useAll, { wrapper });
    // The rental analysis starts when rent is entered.
    act(() =>
      result.current.edits.editDeal('rental.grossMonthlyRent', 2_800, 'sheet'),
    );
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.editor.setRehab(50_000));
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.editor.setPurchaseClosing(6_000));
    const { rental, refinance } = result.current.store.activeScenario;
    expect(rental?.rehabBudget).toBe(50_000);
    expect(rental?.closingCosts).toBe(6_000);
    expect(refinance ?? null).toBeNull();
  });

  it('keeps a separate refinance phase per scenario once a copy is edited', () => {
    const { result } = renderHook(useAll, { wrapper });
    const firstId = result.current.store.activeScenario.id;
    act(() => result.current.editor.setArv(320_000));
    // A new scenario starts as a copy of the active one (as it does for rent and sale inputs).
    act(() => result.current.store.addScenario());
    const secondId = result.current.store.activeScenario.id;
    expect(secondId).not.toBe(firstId);
    expect(result.current.store.activeScenario.refinance).toEqual({
      arvDollars: 320_000,
    });

    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.editor.setMode('rate-drop'));
    act(() => result.current.editor.setArv(400_000));
    expect(result.current.store.activeScenario.refinance).toEqual({
      arvDollars: 400_000,
      mode: 'rate-drop',
    });

    // The first scenario is untouched by edits to the copy.
    act(() => result.current.store.setActiveScenarioId(firstId));
    expect(result.current.store.activeScenario.refinance).toEqual({
      arvDollars: 320_000,
    });
  });

  it('undo restores the previous refinance value', () => {
    const { result } = renderHook(useAll, { wrapper });
    act(() => result.current.editor.setNewRate(6.5));
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.editor.setNewRate(5.5));
    expect(result.current.store.activeScenario.refinance?.newRatePct).toBe(5.5);
    act(() => result.current.edits.undo());
    expect(result.current.store.activeScenario.refinance?.newRatePct).toBe(6.5);
  });
});
