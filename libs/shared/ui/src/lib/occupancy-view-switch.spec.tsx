import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  DEFAULT_RENTAL_ASSUMPTIONS,
  deserializeScenarios,
  serializeScenarios,
  type LoanScenario,
} from 'shared-calculations';
import { DealEditsProvider, ScenariosProvider } from 'shared-data-access';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { OccupancyViewSwitch } from './occupancy-view-switch';

const KEY = 'amortization:scenarios';

beforeAll(() => {
  Element.prototype.getAnimations ??= () => [];
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

function seed(ownerOccupied: boolean) {
  const scenario = {
    id: 's1',
    name: 'Scenario 1',
    principal: 300_000,
    annualInterestRatePct: 6.5,
    termMonths: 360,
    startDate: '2027-01-01',
    paymentFrequency: 'monthly',
    homePrice: 400_000,
    downPayment: { percent: 25 },
    annualPropertyTax: null,
    annualInsurance: null,
    pmiAnnualRatePct: null,
    monthlyHoa: null,
    extraPayments: [],
    principalIsOverridden: false,
    rental: {
      ...DEFAULT_RENTAL_ASSUMPTIONS,
      grossMonthlyRent: 2_750,
      units: [
        {
          id: 'a',
          name: 'Unit A',
          bedrooms: null,
          bathrooms: null,
          rent: 1_350,
          vacancyPct: null,
          ownerOccupied,
          rentAfterMoveOut: ownerOccupied ? 1_350 : null,
        },
      ],
    },
  };
  window.sessionStorage.setItem(
    KEY,
    serializeScenarios([scenario as LoanScenario], 's1'),
  );
}

const renderSwitch = () =>
  render(
    <ScenariosProvider>
      <DealEditsProvider>
        <OccupancyViewSwitch />
      </DealEditsProvider>
    </ScenariosProvider>,
  );

describe('OccupancyViewSwitch (spec 012 T025)', () => {
  it('renders nothing without an owner-occupied unit', () => {
    seed(false);
    renderSwitch();
    expect(screen.queryByTestId('occupancy-view')).toBeNull();
  });

  it('starts on "Living there" and saves "After move-out" on the scenario', () => {
    seed(true);
    renderSwitch();
    const living = screen.getByRole('radio', { name: 'Living there' });
    expect(living.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'After move-out' }));
    expect(
      screen
        .getByRole('radio', { name: 'After move-out' })
        .getAttribute('aria-checked'),
    ).toBe('true');
    const saved = deserializeScenarios(
      window.sessionStorage.getItem(KEY) ?? '',
    );
    expect(saved?.scenarios[0].rental?.occupancyView).toBe('afterMoveOut');
  });
});
