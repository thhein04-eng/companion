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
  type RentalAssumptions,
} from 'shared-calculations';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RentalInputsPanel } from './rental-inputs-panel';

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
afterEach(cleanup);

function Harness() {
  const [rental, setRental] = useState<RentalAssumptions>({
    ...DEFAULT_RENTAL_ASSUMPTIONS,
    grossMonthlyRent: 2_750,
    customExpenses: [{ id: 'w', label: 'Water/Sewer', monthlyAmount: 180 }],
  });
  return (
    <>
      <RentalInputsPanel
        rental={rental}
        errors={[]}
        onChange={(input) =>
          setRental((r) => {
            const patch = typeof input === 'function' ? input(r) : input;
            return patch ? { ...r, ...patch } : r;
          })
        }
      />
      <output data-testid="expenses">
        {JSON.stringify(rental.customExpenses)}
      </output>
    </>
  );
}

describe('custom expense "Paid by" (spec 012 T030)', () => {
  it('defaults to Landlord, and Tenants (RUBS) shows a Recovered rate of 100%', () => {
    render(<Harness />);
    const row = screen.getByTestId('custom-expense');
    const group = within(row).getByRole('radiogroup', { name: 'Paid by' });
    expect(
      within(group)
        .getByRole('radio', { name: 'Landlord' })
        .getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      within(row).queryByRole('textbox', { name: 'Recovered' }),
    ).toBeNull();

    fireEvent.click(
      within(group).getByRole('radio', { name: 'Tenants (RUBS)' }),
    );
    expect(
      within(row).getByRole('textbox', { name: 'Recovered' }),
    ).toHaveProperty('value', '100');
    expect(
      JSON.parse(screen.getByTestId('expenses').textContent ?? '[]'),
    ).toEqual([
      { id: 'w', label: 'Water/Sewer', monthlyAmount: 180, paidBy: 'rubs' },
    ]);
  });
});
