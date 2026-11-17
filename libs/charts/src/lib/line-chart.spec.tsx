import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { LineChart } from './line-chart';
import type { Datum, SeriesDef } from './types';
import { stubResizeObserver } from './test-utils';

// Non-amortization fixture: monthly average temperatures (°C) for two cities.
type City = 'oslo' | 'lisbon';
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const oslo = [-4, -4, 0, 5, 11, 15, 17, 16, 11, 6, 1, -3];
const lisbon = [11, 12, 14, 16, 18, 21, 23, 23, 22, 18, 14, 12];
const data: Datum<City>[] = months.map((_, i) => ({ x: i, oslo: oslo[i], lisbon: lisbon[i] }));
const series: SeriesDef<City>[] = [
  { key: 'oslo', label: 'Oslo', color: 1 },
  { key: 'lisbon', label: 'Lisbon', color: 2 },
];
const formatters = { x: (i: number) => months[i], y: (v: number) => `${v}°` };

beforeEach(() => stubResizeObserver(600));
afterEach(cleanup);

describe('LineChart', () => {
  it('draws one path per series and a legend for 2+ series', () => {
    const { container } = render(<LineChart title="Temperatures" data={data} series={series} formatters={formatters} yDomain="auto" />);
    expect(container.querySelectorAll('path[data-series]')).toHaveLength(2);
    const legend = screen.getByRole('list', { name: 'Legend' });
    expect(within(legend).getByText('Oslo')).toBeTruthy();
    expect(within(legend).getByText('Lisbon')).toBeTruthy();
    expect(container.querySelector('path[data-series="oslo"]')?.getAttribute('stroke')).toBe('var(--chart-series-1)');
  });

  it('has no legend for a single series', () => {
    render(<LineChart title="Oslo" data={data} series={[series[0]]} formatters={formatters} yDomain="auto" />);
    expect(screen.queryByRole('list', { name: 'Legend' })).toBeNull();
  });

  it('steps through points with the keyboard and announces them', () => {
    render(<LineChart title="Temperatures" data={data} series={series} formatters={formatters} yDomain="auto" />);
    const plot = screen.getByRole('group', { name: 'Temperatures' });
    expect(plot.getAttribute('aria-roledescription')).toBe('chart');
    act(() => plot.focus());
    fireEvent.keyDown(plot, { key: 'ArrowRight' });
    const live = plot.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toBe('Jan, Oslo -4°, Lisbon 11°');
    fireEvent.keyDown(plot, { key: 'End' });
    expect(live?.textContent).toContain('Dec');
    fireEvent.keyDown(plot, { key: 'Escape' });
    expect(live?.textContent).toBe('');
  });

  it('breaks the path at null values', () => {
    const gappy: Datum<'oslo'>[] = data.map((d, i) => ({ x: d.x, oslo: i === 5 ? null : (d.oslo as number) }));
    const { container } = render(
      <LineChart title="Gappy" data={gappy} series={[{ key: 'oslo', label: 'Oslo', color: 1 }]} yDomain="auto" />
    );
    const d = container.querySelector('path[data-series="oslo"]')?.getAttribute('d') ?? '';
    expect(d.match(/M/g)).toHaveLength(2);
  });

  it("with yDomain 'auto' covers negative data and draws a zero baseline", () => {
    const { container } = render(<LineChart title="Temperatures" data={data} series={series} formatters={formatters} yDomain="auto" />);
    const tickLabels = Array.from(container.querySelectorAll('text')).map((t) => t.textContent ?? '');
    const yValues = tickLabels.filter((t) => t.endsWith('°')).map((t) => Number(t.replace('°', '')));
    expect(Math.min(...yValues)).toBeLessThanOrEqual(-4);
    expect(container.querySelector('line[data-zero-line]')?.getAttribute('stroke')).toBe('var(--chart-axis)');
  });

  it('shows tooltipExtras rows', () => {
    render(
      <LineChart
        title="Temperatures"
        data={data}
        series={series}
        formatters={formatters}
        yDomain="auto"
        tooltipExtras={(i) => [{ label: 'Month #', value: String(i + 1) }]}
      />
    );
    const plot = screen.getByRole('group', { name: 'Temperatures' });
    fireEvent.keyDown(plot, { key: 'ArrowRight' });
    expect(plot.querySelector('[aria-live="polite"]')?.textContent).toContain('Month # 1');
  });

  it('reveals a data table with one row per point', () => {
    render(<LineChart title="Temperatures" data={data} series={series} formatters={formatters} yDomain="auto" />);
    fireEvent.click(screen.getByRole('button', { name: 'Show data' }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(13); // header + 12
  });
});

describe('LineChart edge cases', () => {
  const noNaN = (container: HTMLElement) => {
    for (const el of Array.from(container.querySelectorAll('*'))) {
      for (const attr of Array.from(el.attributes)) expect(attr.value).not.toContain('NaN');
    }
  };

  it('renders a single point without NaN', () => {
    const { container } = render(<LineChart title="One" data={[{ x: 0, v: 5 }]} series={[{ key: 'v', label: 'V', color: 1 }]} />);
    noNaN(container);
  });

  it('renders an all-zero series (0% interest) without NaN', () => {
    const zeros = Array.from({ length: 12 }, (_, i) => ({ x: i, v: 0 }));
    const { container } = render(<LineChart title="Zeros" data={zeros} series={[{ key: 'v', label: 'V', color: 1 }]} />);
    noNaN(container);
  });

  it('thins x ticks at a narrow width', () => {
    cleanup();
    stubResizeObserver(300);
    const long = Array.from({ length: 361 }, (_, i) => ({ x: i, v: 361 - i }));
    const { container } = render(<LineChart title="Narrow" data={long} series={[{ key: 'v', label: 'V', color: 1 }]} formatters={{ x: (n) => `x${n}` }} />);
    const xTicks = Array.from(container.querySelectorAll('text')).filter((t) => t.textContent?.startsWith('x'));
    expect(xTicks.length).toBeLessThanOrEqual(3);
  });
});
