import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { useState } from 'react';
import type { ExtraPaymentRule } from 'shared-calculations';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ExtraPaymentPanel } from './extra-payment-panel';

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
});
afterEach(cleanup);

function Harness({ initial = [] as ExtraPaymentRule[], onChange = vi.fn() }) {
  const [rules, setRules] = useState(initial);
  return (
    <ExtraPaymentPanel
      extraPayments={rules}
      onChange={(next) => {
        onChange(next);
        setRules(next);
      }}
    />
  );
}

describe('ExtraPaymentPanel (spec 011 US2)', () => {
  it('labels every control and explains recurring timing', () => {
    render(<Harness />);
    expect(screen.getByText('Type')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Amount' })).toBeTruthy();
    expect(screen.getByText('When')).toBeTruthy();
    expect(
      screen.getByText('Every month, starting with payment 1'),
    ).toBeTruthy();
    expect(screen.getByTestId('extra-payments-empty')).toBeTruthy();
  });

  it('shows a Date field for one-time payments', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('radio', { name: 'One-time' }));
    expect(screen.getByText('Date')).toBeTruthy();
    expect(
      screen.queryByText('Every month, starting with payment 1'),
    ).toBeNull();
  });

  it('adds a recurring payment from payment 1 and lists it', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const amount = screen.getByRole('textbox', { name: 'Amount' });
    fireEvent.change(amount, { target: { value: '200' } });
    fireEvent.blur(amount);
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        kind: 'recurring',
        amount: 200,
        startPeriod: 1,
      }),
    ]);
    const list = screen.getByRole('list', { name: 'Extra payments' });
    const row = within(list).getByTestId('extra-payment-row');
    expect(row.textContent).toContain('Monthly');
    expect(row.textContent).toContain('$200.00');
    expect(row.textContent).toContain('Monthly from payment 1');
  });

  it('removes only the chosen payment', () => {
    render(
      <Harness
        initial={[
          { id: 'a', kind: 'recurring', amount: 200, startPeriod: 1 },
          { id: 'b', kind: 'oneTime', amount: 5000, date: '2027-06-01' },
        ]}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove extra payment of $200.00' }),
    );
    const rows = screen.getAllByTestId('extra-payment-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('One-time');
    expect(rows[0].textContent).toContain('$5,000.00');
  });
});
