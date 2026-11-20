import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import type {
  MaxOfferResult,
  SensitivityTarget,
} from 'deal-analyzer-calculations';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MaxOfferCard, type MaxOfferCardProps } from './max-offer-card';

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

const cashFlowTarget: SensitivityTarget & { isSet: boolean } = {
  measure: 'cashFlow',
  value: 300,
  isSet: true,
};

const found = (
  over: Partial<Extract<MaxOfferResult, { status: 'found' }>> = {},
): MaxOfferResult => ({
  status: 'found',
  price: 231_500,
  deltaFromCurrent: -18_500,
  deltaPct: -0.074,
  currentMeets: false,
  atOffer: { cashFlowMonthly: 300.12, cashOnCash: 0.0612 },
  atCurrent: { cashFlowMonthly: 250.56, cashOnCash: 0.0481 },
  ...over,
});

function setup(over: Partial<MaxOfferCardProps> = {}) {
  const props: MaxOfferCardProps = {
    homePrice: 250_000,
    target: cashFlowTarget,
    result: found(),
    errors: [],
    onMeasureChange: vi.fn(),
    onValueChange: vi.fn(),
    onUsePrice: vi.fn(),
    ...over,
  };
  render(<MaxOfferCard {...props} />);
  return props;
}

describe('MaxOfferCard (spec 015 contracts/ui.md)', () => {
  it('shows the offer, how far it is from your price, and both figures', () => {
    setup();
    expect(screen.getByTestId('max-offer-price').textContent).toBe('$231,500');
    expect(screen.getByTestId('max-offer-delta').textContent).toBe(
      '$18,500 below your price of $250,000 (−7.4%).',
    );
    const result = screen.getByTestId('max-offer');
    expect(
      within(result).getByText('At the offer').nextElementSibling?.textContent,
    ).toBe('$300.12/mo');
    expect(
      within(result).getByText('At your price').nextElementSibling?.textContent,
    ).toBe('$250.56/mo');
    expect(screen.queryByTestId('max-offer-already')).toBeNull();
  });

  it('uses "Use this price" to hand the offer to the page', () => {
    const props = setup();
    fireEvent.click(screen.getByTestId('use-max-offer'));
    expect(props.onUsePrice).toHaveBeenCalledWith(231_500);
  });

  it('says so when the current price already meets the target, and the offer is above it', () => {
    setup({
      result: found({
        price: 268_000,
        deltaFromCurrent: 18_000,
        deltaPct: 0.072,
        currentMeets: true,
      }),
    });
    expect(screen.getByTestId('max-offer-already').textContent).toContain(
      'Your price already meets this target.',
    );
    expect(screen.getByTestId('max-offer-delta').textContent).toBe(
      '$18,000 above your price of $250,000 (+7.2%).',
    );
  });

  it('hides the button when the offer is the current price', () => {
    setup({
      result: found({
        price: 250_000,
        deltaFromCurrent: 0,
        deltaPct: 0,
        currentMeets: true,
      }),
    });
    expect(screen.queryByTestId('use-max-offer')).toBeNull();
    expect(screen.getByTestId('max-offer-delta').textContent).toBe(
      'The same as your price of $250,000.',
    );
  });

  it('shows Cash-on-Cash figures when that is the target', () => {
    setup({ target: { measure: 'cashOnCash', value: 6, isSet: true } });
    const result = screen.getByTestId('max-offer');
    expect(
      within(result).getByText('At the offer').nextElementSibling?.textContent,
    ).toBe('6.12%');
    expect(
      within(result).getByText('At your price').nextElementSibling?.textContent,
    ).toBe('4.81%');
  });

  it('says no price reaches an unreachable target, with no number', () => {
    setup({
      result: {
        status: 'unreachable',
        reason:
          'No price reaches this target at this rent and rate. A higher rent or a lower rate would help.',
      },
    });
    expect(screen.getByTestId('max-offer-unreachable').textContent).toContain(
      'No price reaches this target at this rent and rate.',
    );
    expect(screen.queryByTestId('max-offer-price')).toBeNull();
    expect(screen.queryByTestId('use-max-offer')).toBeNull();
  });

  it('shows only the inline error for an invalid target', () => {
    setup({
      target: { measure: 'cashOnCash', value: -1, isSet: true },
      result: { status: 'invalid', reason: 'Use 0–1000%' },
      errors: [
        { field: 'rental.sensitivity.cashOnCashPct', message: 'Use 0–1000%' },
      ],
    });
    expect(screen.getAllByText('Use 0–1000%')).toHaveLength(1);
    expect(screen.queryByTestId('max-offer-price')).toBeNull();
  });

  it('labels the defaults until a target is set', () => {
    setup({ target: { ...cashFlowTarget, isSet: false } });
    expect(screen.getByTestId('target-default').textContent).toContain(
      'Default target',
    );
    cleanup();
    setup();
    expect(screen.queryByTestId('target-default')).toBeNull();
  });

  it('reports the measure the investor chooses', () => {
    const props = setup({
      target: { measure: 'cashOnCash', value: 8, isSet: true },
    });
    const group = screen.getByRole('radiogroup', { name: 'Target measure' });
    fireEvent.click(
      within(group).getByRole('radio', { name: 'Monthly cash flow' }),
    );
    expect(props.onMeasureChange).toHaveBeenCalledWith('cashFlow');
  });
});
