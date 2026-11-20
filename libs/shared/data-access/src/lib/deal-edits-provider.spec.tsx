import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { DEFAULT_RENTAL_ASSUMPTIONS } from 'shared-calculations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DealEditsProvider, useDealEdits } from './deal-edits-provider';
import { ScenariosProvider, useScenarios } from './scenarios-provider';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ScenariosProvider>
      <DealEditsProvider>{children}</DealEditsProvider>
    </ScenariosProvider>
  );
}

const useBoth = () => ({ edits: useDealEdits(), store: useScenarios() });

describe('DealEditsProvider (spec 010 R7, data-model §B)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('writes the value and records the change with display text', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() =>
      result.current.edits.editDeal('annualInterestRatePct', 6, 'chip'),
    );
    expect(result.current.store.activeScenario.annualInterestRatePct).toBe(6);
    expect(result.current.edits.lastChange).toMatchObject({
      field: 'annualInterestRatePct',
      label: 'Rate',
      oldValue: 6.5,
      newValue: 6,
      oldDisplay: '6.5%',
      newDisplay: '6%',
      source: 'chip',
    });
  });

  it('records a page edit (spec 017 "Use this price") and undoes it', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() => result.current.edits.editDeal('homePrice', 450_000, 'sheet'));
    act(() => vi.advanceTimersByTime(1_000));
    act(() => result.current.edits.editDeal('homePrice', 231_500, 'page'));
    expect(result.current.store.activeScenario.homePrice).toBe(231_500);
    expect(result.current.edits.lastChange).toMatchObject({
      field: 'homePrice',
      oldValue: 450_000,
      newValue: 231_500,
      source: 'page',
    });
    act(() => result.current.edits.undo());
    expect(result.current.store.activeScenario.homePrice).toBe(450_000);
  });

  it('coalesces edits to the same field within 800ms, keeping the first old value', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() =>
      result.current.edits.editDeal('annualInterestRatePct', 6, 'chip'),
    );
    const seq = result.current.edits.changeSeq;
    act(() => vi.advanceTimersByTime(500));
    act(() =>
      result.current.edits.editDeal('annualInterestRatePct', 5.5, 'chip'),
    );
    expect(result.current.edits.lastChange).toMatchObject({
      oldValue: 6.5,
      newValue: 5.5,
    });
    expect(result.current.edits.changeSeq).toBe(seq + 1);
  });

  it('starts a new record after 800ms, or when a different field changes', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() =>
      result.current.edits.editDeal('annualInterestRatePct', 6, 'chip'),
    );
    act(() => vi.advanceTimersByTime(900));
    act(() =>
      result.current.edits.editDeal('annualInterestRatePct', 5.5, 'chip'),
    );
    expect(result.current.edits.lastChange).toMatchObject({
      oldValue: 6,
      newValue: 5.5,
    });
    act(() => result.current.edits.editDeal('termMonths', 180, 'chip'));
    expect(result.current.edits.lastChange).toMatchObject({
      field: 'termMonths',
      oldValue: 360,
      newValue: 180,
    });
  });

  it('coalesces a whole scrub gesture until endGesture()', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() =>
      result.current.edits.editDeal('annualInterestRatePct', 6.625, 'scrub'),
    );
    act(() => vi.advanceTimersByTime(2_000));
    act(() =>
      result.current.edits.editDeal('annualInterestRatePct', 6.75, 'scrub'),
    );
    expect(result.current.edits.lastChange).toMatchObject({
      oldValue: 6.5,
      newValue: 6.75,
    });
    act(() => result.current.edits.endGesture());
    act(() =>
      result.current.edits.editDeal('annualInterestRatePct', 6.875, 'scrub'),
    );
    expect(result.current.edits.lastChange).toMatchObject({ oldValue: 6.75 });
  });

  it('undo restores the exact earlier scenario and clears the record', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() => result.current.edits.editDeal('homePrice', 450_000, 'sheet'));
    act(() => vi.advanceTimersByTime(900));
    act(() =>
      result.current.edits.editDeal('downPayment', { percent: 20 }, 'sheet'),
    );
    expect(result.current.store.activeScenario.principal).toBe(360_000);
    const seq = result.current.edits.changeSeq;
    act(() => result.current.edits.undo());
    expect(result.current.store.activeScenario.downPayment).toBeNull();
    expect(result.current.store.activeScenario.principal).toBe(300_000);
    expect(result.current.edits.lastChange).toBeNull();
    expect(result.current.edits.changeSeq).toBe(seq + 1);
  });

  it('undo of a first rent entry removes the seeded rental entirely', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() =>
      result.current.edits.editDeal('rental.grossMonthlyRent', 3_200, 'chip'),
    );
    expect(result.current.store.activeScenario.rental).toEqual({
      ...DEFAULT_RENTAL_ASSUMPTIONS,
      grossMonthlyRent: 3_200,
    });
    expect(result.current.edits.lastChange?.oldValue).toBeNull();
    act(() => result.current.edits.undo());
    expect(result.current.store.activeScenario.rental).toBeNull();
  });

  it('undo falls back to a single-field patch when the scenario changed elsewhere since', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() =>
      result.current.edits.editDeal('annualInterestRatePct', 6, 'chip'),
    );
    act(() => result.current.store.updateActiveScenario({ monthlyHoa: 99 }));
    act(() => result.current.edits.undo());
    expect(result.current.store.activeScenario.annualInterestRatePct).toBe(6.5);
    expect(result.current.store.activeScenario.monthlyHoa).toBe(99);
  });

  it('switching scenario drops the record and does not move changeSeq', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() =>
      result.current.edits.editDeal('annualInterestRatePct', 6, 'chip'),
    );
    const seq = result.current.edits.changeSeq;
    act(() => result.current.store.addScenario());
    expect(result.current.edits.lastChange).toBeNull();
    expect(result.current.edits.changeSeq).toBe(seq);
  });

  it('removing the scenario drops the record', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() => result.current.store.addScenario());
    act(() =>
      result.current.edits.editDeal('annualInterestRatePct', 6, 'chip'),
    );
    const id = result.current.store.activeScenarioId;
    act(() => result.current.store.removeScenario(id));
    expect(result.current.edits.lastChange).toBeNull();
  });
});

describe('DealEditsProvider.editSale (spec 013 T007)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('merges the patch into scenario.sale and records a "Sale inputs" change', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() => result.current.edits.editSale({ exitMonth: 90 }, 'sheet'));
    act(() => result.current.edits.editSale({ exitUnit: 'months' }, 'sheet'));
    expect(result.current.store.activeScenario.sale).toEqual({
      exitMonth: 90,
      exitUnit: 'months',
    });
    expect(result.current.edits.lastChange).toMatchObject({
      field: 'sale',
      label: 'Sale inputs',
      oldValue: null,
      newValue: { exitMonth: 90, exitUnit: 'months' },
      oldDisplay: '',
      newDisplay: '',
      source: 'sheet',
    });
  });

  it('coalesces sale edits within 800ms into one record', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() => result.current.edits.editSale({ exitMonth: 60 }, 'sheet'));
    const seq = result.current.edits.changeSeq;
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current.edits.editSale({ exitMonth: 72 }, 'sheet'));
    expect(result.current.edits.lastChange).toMatchObject({
      oldValue: null,
      newValue: { exitMonth: 72 },
    });
    expect(result.current.edits.changeSeq).toBe(seq + 1);
  });

  it('undo restores the previous sale (absent)', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() => result.current.edits.editSale({ exitMonth: 90 }, 'sheet'));
    act(() => result.current.edits.undo());
    expect(result.current.store.activeScenario.sale ?? null).toBeNull();
    expect(result.current.edits.lastChange).toBeNull();
  });

  it('undo falls back to restoring only sale when the scenario changed elsewhere', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() => result.current.edits.editSale({ exitMonth: 60 }, 'sheet'));
    act(() => vi.advanceTimersByTime(1000));
    act(() =>
      result.current.edits.editSale(
        { exitUnit: 'months', tax: { enabled: true } },
        'sheet',
      ),
    );
    act(() => result.current.store.updateActiveScenario({ monthlyHoa: 99 }));
    act(() => result.current.edits.undo());
    const sale = result.current.store.activeScenario.sale;
    expect(sale?.exitMonth).toBe(60);
    expect(sale?.exitUnit).toBeUndefined();
    expect(sale?.tax).toBeUndefined();
    expect(result.current.store.activeScenario.monthlyHoa).toBe(99);
  });

  it('ignores a no-op sale edit', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() => result.current.edits.editSale({ exitMonth: 60 }, 'sheet'));
    const seq = result.current.edits.changeSeq;
    act(() => result.current.edits.editSale({ exitMonth: 60 }, 'sheet'));
    expect(result.current.edits.changeSeq).toBe(seq);
  });
});
