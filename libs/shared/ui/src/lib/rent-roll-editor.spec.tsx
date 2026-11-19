import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { useState } from 'react';
import {
  DEFAULT_RENTAL_ASSUMPTIONS,
  type FieldError,
  type RentalAssumptions,
} from 'shared-calculations';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RentRollEditor } from './rent-roll-editor';

beforeAll(() => {
  // jsdom has no Web Animations API; ui-sdk's checkbox asks for it.
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
});
afterEach(cleanup);

function Harness({
  initial,
  errors = [],
}: {
  initial: RentalAssumptions | null;
  errors?: FieldError[];
}) {
  const [rental, setRental] = useState(initial);
  return (
    <>
      <RentRollEditor
        rental={rental}
        errors={errors}
        onChange={(input) =>
          setRental((r) => {
            // Same as `editRental`: an updater gets the latest rental.
            const patch = typeof input === 'function' ? input(r) : input;
            if (patch == null) return r;
            return r
              ? { ...r, ...patch }
              : ({
                  ...DEFAULT_RENTAL_ASSUMPTIONS,
                  ...patch,
                } as RentalAssumptions);
          })
        }
      />
      <output data-testid="gross">{rental?.grossMonthlyRent ?? 'none'}</output>
    </>
  );
}

const single = (rent = 1_350): RentalAssumptions => ({
  ...DEFAULT_RENTAL_ASSUMPTIONS,
  grossMonthlyRent: rent,
});

describe('RentRollEditor (spec 012 US1)', () => {
  it('shows one "Monthly rent" field for a single unit, with no Remove', () => {
    render(<Harness initial={single()} />);
    expect(screen.getByRole('textbox', { name: 'Monthly rent' })).toBeTruthy();
    expect(screen.queryAllByTestId('rent-unit')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /^Remove/ })).toBeNull();
  });

  it('has no "+ Add unit" before there is any rent', () => {
    render(<Harness initial={null} />);
    expect(screen.queryByTestId('add-unit')).toBeNull();
  });

  it('"+ Add unit" turns the rent into unit cards with a total', () => {
    render(<Harness initial={single()} />);
    fireEvent.click(screen.getByTestId('add-unit'));
    const cards = screen.getAllByTestId('rent-unit');
    expect(cards).toHaveLength(2);
    expect(
      within(cards[0]).getByRole('textbox', { name: 'Name' }),
    ).toHaveProperty('value', 'Unit A');
    expect(screen.getByRole('group', { name: 'Unit B' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove Unit B' })).toBeTruthy();
    expect(screen.getByTestId('rent-roll-total').textContent).toBe(
      'Total rent $1,350.00/mo',
    );
  });

  it('stops at 4 units with a note', () => {
    render(<Harness initial={single()} />);
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByTestId('add-unit'));
    expect(screen.getAllByTestId('rent-unit')).toHaveLength(4);
    expect(screen.getByTestId('add-unit')).toHaveProperty('disabled', true);
    expect(screen.getByText('Rent rolls cover 1–4 unit homes.')).toBeTruthy();
  });

  it('removing back to one unit returns to the single field, keeping the total in sync', () => {
    render(<Harness initial={single()} />);
    fireEvent.click(screen.getByTestId('add-unit'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Unit A' }));
    expect(screen.queryAllByTestId('rent-unit')).toHaveLength(0);
    expect(screen.getByTestId('gross').textContent).toBe('0');
  });

  it('a unit’s vacancy is empty by default and says it uses the overall rate (US2)', () => {
    render(<Harness initial={single()} />);
    fireEvent.click(screen.getByTestId('add-unit'));
    const b = screen.getByRole('group', { name: 'Unit B' });
    expect(within(b).getByRole('textbox', { name: 'Vacancy' })).toHaveProperty(
      'value',
      '',
    );
    expect(within(b).getByText('Empty uses the overall 5%.')).toBeTruthy();
  });

  it('"I live here" on a duplex: rent after move-out, $0 while living there, move-out years (US3)', () => {
    render(<Harness initial={single()} />);
    fireEvent.click(screen.getByTestId('add-unit'));
    const a = screen.getByRole('group', { name: 'Unit A' });
    fireEvent.click(within(a).getByRole('checkbox', { name: 'I live here' }));
    expect(
      within(a).getByRole('textbox', { name: 'Rent after move-out' }),
    ).toHaveProperty('value', '$1,350.00');
    expect(within(a).getByText('Rent while you live here: $0')).toBeTruthy();
    expect(screen.getByTestId('rent-roll-total').textContent).toContain(
      'while living there $0.00/mo',
    );
    expect(
      screen.getByRole('textbox', { name: 'Move out after (years)' }),
    ).toHaveProperty('value', '1');
    // Only one unit can be the owner's: checking Unit B moves the flag.
    const b = screen.getByRole('group', { name: 'Unit B' });
    fireEvent.click(within(b).getByRole('checkbox', { name: 'I live here' }));
    expect(
      within(a)
        .getByRole('checkbox', { name: 'I live here' })
        .getAttribute('aria-checked'),
    ).toBe('false');
  });

  it('a single home can be the owner’s too, with no Remove', () => {
    render(<Harness initial={single(2_000)} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'I live here' }));
    const a = screen.getByRole('group', { name: 'Unit A' });
    expect(
      within(a).getByRole('textbox', { name: 'Rent after move-out' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Remove/ })).toBeNull();
    // Unchecking returns to the single field with the rent after move-out as the rent.
    fireEvent.click(within(a).getByRole('checkbox', { name: 'I live here' }));
    expect(
      screen.getByRole('textbox', { name: 'Monthly rent' }),
    ).toHaveProperty('value', '$2,000.00');
  });

  it('shows a unit’s error under its field', () => {
    render(
      <Harness
        initial={{
          ...single(),
          units: [
            {
              id: 'a',
              name: 'Unit A',
              bedrooms: null,
              bathrooms: null,
              rent: 1_350,
              vacancyPct: null,
              ownerOccupied: false,
              rentAfterMoveOut: null,
            },
            {
              id: 'b',
              name: '',
              bedrooms: null,
              bathrooms: null,
              rent: 0,
              vacancyPct: null,
              ownerOccupied: false,
              rentAfterMoveOut: null,
            },
          ],
        }}
        errors={[
          { field: 'rental.units.1.name', message: 'Enter a unit name' },
        ]}
      />,
    );
    const second = screen.getByRole('group', { name: 'Unit 2' });
    expect(within(second).getByText('Enter a unit name')).toBeTruthy();
  });
});
