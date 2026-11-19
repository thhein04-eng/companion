import { act, cleanup, render, screen } from '@testing-library/react';
import {
  DealEditsProvider,
  ScenariosProvider,
  useDealEdits,
  useScenarios,
} from 'shared-data-access';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ripple } from './ripple';

let api: {
  edits: ReturnType<typeof useDealEdits>;
  store: ReturnType<typeof useScenarios>;
};

function Probe() {
  const edits = useDealEdits();
  const store = useScenarios();
  api = { edits, store };
  const rate = store.activeScenario.annualInterestRatePct;
  return (
    <Ripple value={rate}>
      <span data-testid="figure">{rate}</span>
    </Ripple>
  );
}

function renderProbe() {
  render(
    <ScenariosProvider>
      <DealEditsProvider>
        <Probe />
      </DealEditsProvider>
    </ScenariosProvider>,
  );
}
const ripple = () => screen.getByTestId('figure').parentElement as HTMLElement;

describe('Ripple (spec 010 US6, FR-029)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.sessionStorage.clear();
  });

  it('does not ripple on the first render', () => {
    renderProbe();
    expect(ripple().dataset.rippling).toBeUndefined();
  });

  it('ripples when an edit changes the value, then clears after 1.5s', () => {
    renderProbe();
    act(() => api.edits.editDeal('annualInterestRatePct', 6, 'chip'));
    expect(ripple().dataset.rippling).toBe('true');
    expect(ripple().className).toContain('bg-warn-soft');
    act(() => vi.advanceTimersByTime(1600));
    expect(ripple().dataset.rippling).toBeUndefined();
  });

  it('does not ripple when a scenario switch changes the value', () => {
    renderProbe();
    act(() => api.store.addScenario());
    act(() => api.store.updateActiveScenario({ annualInterestRatePct: 5 }));
    act(() => api.store.setActiveScenarioId(api.store.scenarios[0].id));
    expect(ripple().dataset.rippling).toBeUndefined();
  });

  it('keeps the highlight but drops the transition under reduced motion', () => {
    renderProbe();
    act(() => api.edits.editDeal('annualInterestRatePct', 6, 'chip'));
    expect(ripple().className).toContain('motion-reduce:transition-none');
  });
});
