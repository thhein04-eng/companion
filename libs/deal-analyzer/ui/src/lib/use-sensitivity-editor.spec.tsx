import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  DEFAULT_RENTAL_ASSUMPTIONS,
  deserializeScenarios,
  serializeScenarios,
  type LoanScenario,
} from 'shared-calculations';
import {
  DealEditsProvider,
  ScenariosProvider,
  useDealEdits,
} from 'shared-data-access';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSensitivityEditor } from './use-sensitivity-editor';

const KEY = 'amortization:scenarios';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ScenariosProvider>
      <DealEditsProvider>{children}</DealEditsProvider>
    </ScenariosProvider>
  );
}

function seed(withRental: boolean) {
  const scenario: LoanScenario = {
    id: 's1',
    name: 'Scenario 1',
    principal: 187_500,
    annualInterestRatePct: 7,
    termMonths: 360,
    startDate: '2027-01-01',
    paymentFrequency: 'monthly',
    homePrice: 250_000,
    downPayment: { percent: 25 },
    annualPropertyTax: 3_000,
    annualInsurance: 1_200,
    pmiAnnualRatePct: null,
    monthlyHoa: null,
    extraPayments: [],
    principalIsOverridden: false,
    rental: withRental
      ? { ...DEFAULT_RENTAL_ASSUMPTIONS, grossMonthlyRent: 2_400 }
      : null,
  };
  window.sessionStorage.setItem(KEY, serializeScenarios([scenario], 's1'));
}

const useBoth = (measure: 'cashOnCash' | 'cashFlow') => ({
  editor: useSensitivityEditor(measure),
  edits: useDealEdits(),
});
const saved = () =>
  deserializeScenarios(window.sessionStorage.getItem(KEY) ?? '')?.scenarios[0]
    .rental?.sensitivity;

describe('useSensitivityEditor (spec 017 R7)', () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(() => window.sessionStorage.clear());

  it('starts with the grid’s measure and the default value, not set', () => {
    seed(true);
    const { result } = renderHook(() => useBoth('cashFlow'), { wrapper });
    expect(result.current.editor.target).toEqual({
      measure: 'cashFlow',
      value: 300,
      isSet: false,
    });
    expect(saved()).toBeUndefined();
  });

  it('saves the measure and each measure’s own value, and then is set', () => {
    seed(true);
    const { result } = renderHook(() => useBoth('cashFlow'), { wrapper });
    act(() => result.current.editor.setValue(425));
    expect(result.current.editor.target).toEqual({
      measure: 'cashFlow',
      value: 425,
      isSet: true,
    });
    act(() => result.current.editor.setMeasure('cashOnCash'));
    expect(result.current.editor.target.value).toBe(8); // Cash-on-Cash keeps its own default
    act(() => result.current.editor.setValue(9.5));
    act(() => result.current.editor.setMeasure('cashFlow'));
    expect(result.current.editor.target.value).toBe(425); // and the earlier value survived
    expect(saved()).toEqual({
      targetMeasure: 'cashFlow',
      cashFlowMonthly: 425,
      cashOnCashPct: 9.5,
    });
  });

  it('makes no undo entry and no change toast, and ignores a cleared field', () => {
    seed(true);
    const { result } = renderHook(() => useBoth('cashOnCash'), { wrapper });
    const seq = result.current.edits.changeSeq;
    act(() => result.current.editor.setValue(10));
    act(() => result.current.editor.setValue(null));
    expect(result.current.editor.target.value).toBe(10);
    expect(result.current.edits.changeSeq).toBe(seq);
    expect(result.current.edits.lastChange).toBeNull();
  });

  it('does nothing without a rental, and still reports the defaults', () => {
    seed(false);
    const { result } = renderHook(() => useBoth('cashOnCash'), { wrapper });
    act(() => result.current.editor.setValue(10));
    expect(result.current.editor.target).toEqual({
      measure: 'cashOnCash',
      value: 8,
      isSet: false,
    });
  });
});
