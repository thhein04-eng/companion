import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PaymentBar } from './payment-bar';
import type { PaymentPart } from './page-profiles';

const parts: PaymentPart[] = [
  {
    field: 'principalAndInterest',
    label: 'Principal & interest',
    monthly: 2275.44,
  },
  { field: 'annualPropertyTax', label: 'Property tax', monthly: 450 },
  { field: 'annualInsurance', label: 'Insurance', monthly: 150 },
  { field: 'pmiAnnualRatePct', label: 'PMI', monthly: 0 },
  { field: 'monthlyHoa', label: 'HOA', monthly: 120 },
];

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof ResizeObserver;
});
afterEach(cleanup);

describe('PaymentBar (spec 010 US4)', () => {
  it('lists every part, including a $0 PMI, and a total that matches the parts', () => {
    render(
      <PaymentBar
        parts={parts}
        total={2995.44}
        downPaymentPct={20}
        onActivate={vi.fn()}
      />,
    );
    const legend = screen.getByTestId('payment-legend');
    expect(legend.textContent).toContain('PMI $0 at 20% down');
    expect(legend.textContent).toContain('$2,995.44');
    const sum = parts.reduce((s, p) => s + p.monthly, 0);
    expect(Math.abs(sum - 2995.44)).toBeLessThanOrEqual(0.01);
  });

  it('activating the tax legend entry asks to focus the tax field', () => {
    const onActivate = vi.fn();
    render(
      <PaymentBar
        parts={parts}
        total={2995.44}
        downPaymentPct={20}
        onActivate={onActivate}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Property tax' }));
    expect(onActivate).toHaveBeenCalledWith('annualPropertyTax');
  });

  it('principal & interest is not a cost to edit', () => {
    render(
      <PaymentBar
        parts={parts}
        total={2995.44}
        downPaymentPct={20}
        onActivate={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Principal & interest' }),
    ).toBeNull();
  });
});
