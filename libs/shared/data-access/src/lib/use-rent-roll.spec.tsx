import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DealEditsProvider, useDealEdits } from './deal-edits-provider';
import { ScenariosProvider, useScenarios } from './scenarios-provider';
import { useRentRoll } from './use-rent-roll';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ScenariosProvider>
      <DealEditsProvider>{children}</DealEditsProvider>
    </ScenariosProvider>
  );
}
const useAll = () => ({
  roll: useRentRoll(),
  store: useScenarios(),
  edits: useDealEdits(),
});

describe('useRentRoll (spec 012 T013)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());
  /** Edits more than 800ms apart are separate changes (spec 010 coalescing). */
  const later = () => vi.setSystemTime(Date.now() + 1_000);

  it('adds a unit, keeps the rent in sync, and Undo removes it again', () => {
    const { result } = renderHook(useAll, { wrapper });
    act(() => result.current.roll.addUnit());
    act(() => result.current.roll.updateUnit('a', { rent: 1_350 }));
    later();
    act(() => result.current.roll.addUnit());
    const rental = () => result.current.store.activeScenario.rental;
    expect(rental()?.units).toHaveLength(3);
    expect(rental()?.grossMonthlyRent).toBe(1_350);
    act(() => result.current.edits.undo());
    expect(rental()?.units).toHaveLength(2);
  });

  it('records a unit removal as an undoable change', () => {
    const { result } = renderHook(useAll, { wrapper });
    act(() => result.current.roll.addUnit());
    act(() => result.current.roll.updateUnit('b', { rent: 1_400 }));
    later();
    act(() => result.current.roll.removeUnit('b'));
    const rental = () => result.current.store.activeScenario.rental;
    expect(rental()?.units).toHaveLength(1);
    expect(result.current.edits.lastChange?.label).toBe('Rent');
    act(() => result.current.edits.undo());
    expect(rental()?.units).toHaveLength(2);
    expect(rental()?.grossMonthlyRent).toBe(1_400);
  });

  it('switches the income view without an undo entry', () => {
    const { result } = renderHook(useAll, { wrapper });
    act(() => result.current.roll.addUnit());
    act(() => result.current.roll.setOwnerUnit('a'));
    const before = result.current.edits.changeSeq;
    act(() => result.current.roll.setOccupancyView('afterMoveOut'));
    expect(result.current.store.activeScenario.rental?.occupancyView).toBe(
      'afterMoveOut',
    );
    expect(result.current.edits.changeSeq).toBe(before);
  });
});
