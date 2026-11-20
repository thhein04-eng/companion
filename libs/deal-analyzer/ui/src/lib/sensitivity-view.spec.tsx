import { cleanup, render, screen } from '@testing-library/react';
import {
  DEFAULT_RENTAL_ASSUMPTIONS,
  serializeScenarios,
  type LoanScenario,
} from 'shared-calculations';
import { DealEditsProvider, ScenariosProvider } from 'shared-data-access';
import { DealSheetProvider } from 'shared-ui';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SensitivityView } from './sensitivity-view';

beforeAll(() => {
  window.matchMedia ??= vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
  globalThis.ResizeObserver ??= class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof ResizeObserver;
});
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

function renderWith(over: Partial<LoanScenario>) {
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
    rental: { ...DEFAULT_RENTAL_ASSUMPTIONS, grossMonthlyRent: 2_400 },
    ...over,
  };
  window.sessionStorage.setItem(
    'amortization:scenarios',
    serializeScenarios([scenario], 's1'),
  );
  // First-run setup would open the sheet over a deal with no price.
  window.sessionStorage.setItem('companion.setupDone', JSON.stringify(['*']));
  return render(
    <ScenariosProvider>
      <DealEditsProvider>
        <DealSheetProvider>
          <SensitivityView />
        </DealSheetProvider>
      </DealEditsProvider>
    </ScenariosProvider>,
  );
}

describe('SensitivityView page shell (spec 015 US3, FR-018)', () => {
  it('shows the deal card above the page title', () => {
    renderWith({});
    const strip = screen.getByRole('region', { name: 'Deal' });
    const title = screen.getByRole('heading', {
      level: 1,
      name: 'Sensitivity & Max Offer',
    });
    expect(
      strip.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByTestId('sensitivity-na')).toBeNull();
  });

  it.each([
    ['no rent', { rental: null }, 'Add rent to see the sensitivity.'],
    [
      'no home price',
      { homePrice: null },
      'Add a home price to see the sensitivity.',
    ],
    [
      'no down payment',
      { downPayment: null },
      'Add a down payment to see the sensitivity.',
    ],
    [
      'an invalid loan',
      { principal: 0 },
      'Fix the loan inputs to see the sensitivity.',
    ],
  ])('says what is missing with %s', (_name, over, message) => {
    renderWith(over as Partial<LoanScenario>);
    expect(screen.getByTestId('sensitivity-na').textContent).toContain(message);
  });

  it('says to fix the rental inputs when they are invalid', () => {
    renderWith({
      rental: { ...DEFAULT_RENTAL_ASSUMPTIONS, grossMonthlyRent: -5 },
    });
    expect(screen.getByTestId('sensitivity-na').textContent).toContain(
      'Fix the rental inputs to see the sensitivity.',
    );
  });
});
