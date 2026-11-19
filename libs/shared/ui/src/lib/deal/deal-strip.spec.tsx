import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import {
  DEFAULT_RENTAL_ASSUMPTIONS,
  serializeScenarios,
  type LoanScenario,
} from 'shared-calculations';
import { DealEditsProvider, ScenariosProvider } from 'shared-data-access';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DealSheetProvider } from './deal-sheet-context';
import { DealStrip } from './deal-strip';
import {
  AMORTIZATION_PROFILE,
  FINANCING_PROFILE,
  type Headline,
  type PageProfile,
} from './page-profiles';

const headline: Headline = {
  label: 'DSCR',
  value: 1.18,
  naReason: null,
  format: (n) => n.toFixed(2),
  betterWhen: 'higher',
};

beforeAll(() => {
  // jsdom has no matchMedia / ResizeObserver; ui-sdk overlays and the strip use them.
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

function renderStrip(
  profile: PageProfile,
  errors = [] as Parameters<typeof DealStrip>[0]['errors'],
) {
  return render(
    <ScenariosProvider>
      <DealEditsProvider>
        <DealSheetProvider>
          <DealStrip
            profile={profile}
            headline={headline}
            errors={errors}
            payment={null}
          />
        </DealSheetProvider>
      </DealEditsProvider>
    </ScenariosProvider>,
  );
}

const chipKeys = () =>
  Array.from(document.querySelectorAll('[data-chip]')).map((el) =>
    el.getAttribute('data-chip'),
  );

describe('DealStrip (spec 010 US1)', () => {
  it('lays the values out in a fixed order, emphasizing what Financing uses', () => {
    renderStrip(FINANCING_PROFILE);
    expect(chipKeys()).toEqual([
      'homePrice',
      'downPayment',
      'principal',
      'annualInterestRatePct',
      'termMonths',
      'rental.grossMonthlyRent',
      'total',
    ]);
    const tone = (k: string) =>
      document.querySelector(`[data-chip="${k}"]`)?.getAttribute('data-tone');
    expect(tone('annualInterestRatePct')).toBe('pin');
    expect(tone('termMonths')).toBe('pin');
    expect(tone('total')).toBe('total');
    expect(
      document
        .querySelector('[data-chip="homePrice"]')
        ?.hasAttribute('data-empty'),
    ).toBe(true);
  });

  it('keeps the same order on Amortization and mutes Rent', () => {
    renderStrip(AMORTIZATION_PROFILE);
    expect(chipKeys().slice(0, 3)).toEqual([
      'homePrice',
      'downPayment',
      'principal',
    ]);
    expect(
      document
        .querySelector('[data-chip="principal"]')
        ?.getAttribute('data-tone'),
    ).toBe('pin');
  });

  it('shows the error state with visible text on a chip whose field is invalid', () => {
    renderStrip(FINANCING_PROFILE, [
      { field: 'annualInterestRatePct', message: 'Enter a rate.' },
    ]);
    const rate = document.querySelector(
      '[data-chip="annualInterestRatePct"]',
    ) as HTMLElement;
    expect(rate.getAttribute('data-tone')).toBe('err');
    expect(rate.textContent).toContain('invalid');
  });

  it('opens the Edit deal sheet with groups Property, Loan, Monthly costs, Rental in order', async () => {
    renderStrip(FINANCING_PROFILE);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Edit deal' }));
    });
    const dialog = await screen.findByRole('dialog');
    const headings = within(dialog)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual(['Property', 'Loan', 'Monthly costs', 'Rental']);
  });
});

describe('DealStrip with a house-hack (spec 012)', () => {
  function seed(rentAfterMoveOut: number | null) {
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
        grossMonthlyRent: 1_400 + (rentAfterMoveOut ?? 0),
        units: [
          {
            id: 'a',
            name: 'Unit A',
            bedrooms: null,
            bathrooms: null,
            rent: 0,
            vacancyPct: null,
            ownerOccupied: true,
            rentAfterMoveOut,
          },
          {
            id: 'b',
            name: 'Unit B',
            bedrooms: null,
            bathrooms: null,
            rent: 1_400,
            vacancyPct: null,
            ownerOccupied: false,
            rentAfterMoveOut: null,
          },
        ],
      },
    };
    window.sessionStorage.setItem(
      'amortization:scenarios',
      serializeScenarios([scenario as LoanScenario], 's1'),
    );
  }

  it('asks for the rent after move-out when it is missing', () => {
    seed(null);
    renderStrip(FINANCING_PROFILE);
    expect(
      screen.getByRole('button', {
        name: '+ Add rent after move-out to see the full rental',
      }),
    ).toBeTruthy();
  });

  it('shows the living-there rent with the unit count, and no hint once it is set', () => {
    seed(1_350);
    renderStrip(FINANCING_PROFILE);
    expect(
      document.querySelector('[data-chip="rental.grossMonthlyRent"]')
        ?.textContent,
    ).toContain('$1,400 · 2 units');
    expect(
      document.querySelector('[data-missing="rentAfterMoveOut"]'),
    ).toBeNull();
  });
});
