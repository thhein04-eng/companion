import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SegmentedBar } from './segmented-bar';
import type { SegmentDef } from './types';
import { stubResizeObserver } from './test-utils';

// Non-amortization fixture: a monthly household budget.
const budget: SegmentDef[] = [
  { key: 'rent', label: 'Rent', value: 1500, color: 1 },
  { key: 'food', label: 'Food', value: 600, color: 3 },
  { key: 'travel', label: 'Travel', value: 0, color: 4 },
  { key: 'fun', label: 'Fun', value: 400, color: 5 },
];
const usd = (v: number) => `$${v.toFixed(2)}`;

beforeEach(() => stubResizeObserver(600));
afterEach(cleanup);

describe('SegmentedBar', () => {
  it('drops zero-value segments', () => {
    const { container } = render(<SegmentedBar title="Budget" segments={budget} total={2500} formatValue={usd} />);
    expect(container.querySelectorAll('[data-segment]')).toHaveLength(3);
    expect(container.querySelector('[data-segment="travel"]')).toBeNull();
  });

  it('lists label, value and share of the total in the legend, plus the total', () => {
    render(<SegmentedBar title="Budget" segments={budget} total={2500} formatValue={usd} />);
    const legend = screen.getByRole('list', { name: 'Legend' });
    const rent = within(legend).getByText('Rent').closest('li') as HTMLElement;
    expect(rent.textContent).toContain('$1500.00');
    expect(rent.textContent).toContain('60.0%');
    expect(within(legend).getByText('Total').closest('li')?.textContent).toContain('$2500.00');
  });

  it('uses a roving tabindex and arrow keys, showing a tooltip for the focused segment', () => {
    const { container } = render(<SegmentedBar title="Budget" segments={budget} total={2500} formatValue={usd} />);
    const items = screen.getAllByRole('listitem').filter((el) => el.hasAttribute('data-segment'));
    expect(items.map((el) => el.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    act(() => (items[0] as unknown as HTMLElement).focus());
    fireEvent.keyDown(items[0], { key: 'ArrowRight' });
    expect(items[1].getAttribute('tabindex')).toBe('0');
    const tooltip = container.querySelector('[data-chart-tooltip]');
    expect(tooltip?.textContent).toContain('Food');
    expect(tooltip?.textContent).toContain('$600.00');
  });

  it('throws in development with more than 6 segments', () => {
    const many: SegmentDef[] = Array.from({ length: 7 }, (_, i) => ({ key: `k${i}`, label: `K${i}`, value: 1, color: 1 }));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<SegmentedBar title="Too many" segments={many} total={7} formatValue={usd} />)).toThrow(/at most 6/);
    spy.mockRestore();
  });
});
