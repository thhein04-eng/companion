import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { serializeScenarios, type LoanScenario } from 'shared-calculations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScenariosProvider, useScenarios } from './scenarios-provider';

const STORAGE_KEY = 'amortization:scenarios';

function wrapper({ children }: { children: ReactNode }) {
  return <ScenariosProvider>{children}</ScenariosProvider>;
}

function stored(overrides: Partial<LoanScenario> = {}): LoanScenario {
  return {
    id: 'stored-1',
    name: 'Stored',
    principal: 250_000,
    annualInterestRatePct: 7,
    termMonths: 360,
    startDate: '2027-01-01',
    paymentFrequency: 'monthly',
    homePrice: null,
    downPayment: null,
    annualPropertyTax: null,
    annualInsurance: null,
    pmiAnnualRatePct: null,
    monthlyHoa: null,
    extraPayments: [],
    rental: null,
    principalIsOverridden: false,
    ...overrides,
  };
}

describe('ScenariosProvider / useScenarios', () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('restores scenarios from sessionStorage', () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      serializeScenarios([stored()], 'stored-1'),
    );
    const { result } = renderHook(() => useScenarios(), { wrapper });
    expect(result.current.activeScenarioId).toBe('stored-1');
    expect(result.current.activeScenario.principal).toBe(250_000);
  });

  it('persists updates to the same sessionStorage key', () => {
    const { result } = renderHook(() => useScenarios(), { wrapper });
    act(() => result.current.updateActiveScenario({ termMonths: 180 }));
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).scenarios[0].termMonths).toBe(180);
  });

  it('throws when used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useScenarios())).toThrow(
      'useScenarios must be used within <ScenariosProvider>',
    );
  });

  it('keeps working in memory when sessionStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useScenarios(), { wrapper });
    expect(result.current.activeScenario.name).toBe('Scenario 1');
    act(() => result.current.updateActiveScenario({ termMonths: 120 }));
    expect(result.current.activeScenario.termMonths).toBe(120);
  });
});
