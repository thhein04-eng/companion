import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScenariosProvider, useScenarios } from './scenarios-provider';
import {
  resetSetupModeForTests,
  SETUP_DONE_KEY,
  useSetupMode,
} from './use-setup-mode';

function wrapper({ children }: { children: ReactNode }) {
  return <ScenariosProvider>{children}</ScenariosProvider>;
}
const useBoth = () => ({ setup: useSetupMode(), store: useScenarios() });

describe('useSetupMode (spec 010 data-model §E)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    resetSetupModeForTests();
  });
  afterEach(() => vi.restoreAllMocks());

  it('needs setup for the default scenario, which has no home price', () => {
    const { result } = renderHook(useBoth, { wrapper });
    expect(result.current.setup.needsSetup).toBe(true);
  });

  it('skip() ends setup and remembers it for the session', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() => result.current.setup.skip());
    expect(result.current.setup.needsSetup).toBe(false);
    expect(
      JSON.parse(window.sessionStorage.getItem(SETUP_DONE_KEY) ?? '[]'),
    ).toEqual(['initial-scenario']);
  });

  it('a new scenario with no price needs setup; one with a price does not', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() => result.current.setup.skip());
    act(() => result.current.store.addScenario());
    expect(result.current.setup.needsSetup).toBe(true);
    act(() =>
      result.current.store.updateActiveScenario({ homePrice: 450_000 }),
    );
    expect(result.current.setup.needsSetup).toBe(false);
  });

  it('canFinish only once the loan is valid and price and down payment are set', () => {
    const { result } = renderHook(useBoth, { wrapper });
    expect(result.current.setup.canFinish).toBe(false);
    act(() =>
      result.current.store.updateActiveScenario({ homePrice: 450_000 }),
    );
    expect(result.current.setup.canFinish).toBe(false);
    act(() =>
      result.current.store.updateActiveScenario({
        downPayment: { percent: 20 },
      }),
    );
    expect(result.current.setup.canFinish).toBe(true);
    act(() =>
      result.current.store.updateActiveScenario({ annualInterestRatePct: -1 }),
    );
    expect(result.current.setup.canFinish).toBe(false);
  });

  it('finish() ends setup', () => {
    const { result } = renderHook(useBoth, { wrapper });
    act(() =>
      result.current.store.updateActiveScenario({ homePrice: 450_000 }),
    );
    act(() => result.current.store.updateActiveScenario({ homePrice: null }));
    act(() => result.current.setup.finish());
    expect(result.current.setup.needsSetup).toBe(false);
  });

  it('still works in memory when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(useBoth, { wrapper });
    act(() => result.current.setup.skip());
    expect(result.current.setup.needsSetup).toBe(false);
  });
});
