import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { StackedBarChart } from './stacked-bar-chart';
import type { Datum, SeriesDef } from './types';
import { stubResizeObserver } from './test-utils';

// Non-amortization fixture: quarterly profit by product, with one loss.
type Product = 'apples' | 'pears';
const data: Datum<Product>[] = [
  { x: 'Q1', apples: 40, pears: 25 },
  { x: 'Q2', apples: 55, pears: -15 },
  { x: 'Q3', apples: 60, pears: 30 },
  { x: 'Q4', apples: 35, pears: 20 },
];
const series: SeriesDef<Product>[] = [
  { key: 'apples', label: 'Apples', color: 1 },
  { key: 'pears', label: 'Pears', color: 2 },
];

beforeEach(() => stubResizeObserver(600));
afterEach(cleanup);

describe('StackedBarChart', () => {
  it('draws one column per category, each at most 24px wide', () => {
    const { container } = render(
      <StackedBarChart title="Profit" data={data} series={series} />,
    );
    const columns = container.querySelectorAll('g[data-column]');
    expect(columns).toHaveLength(4);
    for (const rect of Array.from(
      container.querySelectorAll('rect[data-series]'),
    )) {
      expect(Number(rect.getAttribute('width'))).toBeLessThanOrEqual(24);
    }
  });

  it('rounds only the outermost segment in each direction', () => {
    const { container } = render(
      <StackedBarChart title="Profit" data={data} series={series} />,
    );
    const q1 = container.querySelector('g[data-column="Q1"]') as Element;
    // Q1: apples (inner, square rect) under pears (outer, rounded up).
    expect(q1.querySelector('rect[data-series="apples"]')).not.toBeNull();
    expect(
      q1
        .querySelector('path[data-series="pears"]')
        ?.getAttribute('data-rounded'),
    ).toBe('up');

    const q2 = container.querySelector('g[data-column="Q2"]') as Element;
    // Q2: apples is the only positive (rounded up); pears is negative (rounded down, below 0).
    expect(
      q2
        .querySelector('path[data-series="apples"]')
        ?.getAttribute('data-rounded'),
    ).toBe('up');
    const negative = q2.querySelector('path[data-series="pears"]');
    expect(negative?.getAttribute('data-rounded')).toBe('down');

    const zero = container.querySelector('line[data-zero-line]');
    expect(zero?.getAttribute('stroke')).toBe('var(--chart-axis)');
    const zeroY = Number(zero?.getAttribute('y1'));
    const negTop = Number(
      (negative?.getAttribute('d') ?? '').match(/^M[\d.]+,([\d.]+)/)?.[1],
    );
    expect(negTop).toBeGreaterThanOrEqual(zeroY - 0.01);
  });

  it('steps through categories with the keyboard and announces values and the signed total', () => {
    render(
      <StackedBarChart
        title="Profit"
        data={data}
        series={series}
        tooltipExtras={(i: number) => [
          { label: 'Quarter #', value: String(i + 1) },
        ]}
      />,
    );
    const plot = screen.getByRole('group', { name: 'Profit' });
    fireEvent.keyDown(plot, { key: 'ArrowRight' });
    fireEvent.keyDown(plot, { key: 'ArrowRight' });
    const live =
      plot.parentElement?.querySelector('[aria-live="polite"]')?.textContent ??
      '';
    expect(live).toContain('Q2');
    expect(live).toContain('Apples 55');
    expect(live).toContain('Pears -15');
    expect(live).toContain('Total 40');
    expect(live).toContain('Quarter # 2');
  });

  it('has a legend and a data table', () => {
    render(<StackedBarChart title="Profit" data={data} series={series} />);
    const legend = screen.getByRole('list', { name: 'Legend' });
    expect(within(legend).getByText('Apples')).toBeTruthy();
    expect(within(legend).getByText('Pears')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show data' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(
      5,
    );
  });
});

describe('StackedBarChart edge cases', () => {
  it('renders a single category without NaN', () => {
    const { container } = render(
      <StackedBarChart
        title="One"
        data={[{ x: 'Yr 1', a: 12_000, b: 0 }]}
        series={[
          { key: 'a', label: 'A', color: 1 },
          { key: 'b', label: 'B', color: 2 },
        ]}
      />,
    );
    for (const el of Array.from(container.querySelectorAll('*'))) {
      for (const attr of Array.from(el.attributes))
        expect(attr.value).not.toContain('NaN');
    }
  });

  it('draws an all-negative dataset entirely below the zero baseline', () => {
    const { container } = render(
      <StackedBarChart
        title="Losses"
        data={[
          { x: 'A', a: -5, b: -3 },
          { x: 'B', a: -2, b: -4 },
        ]}
        series={[
          { key: 'a', label: 'A', color: 1 },
          { key: 'b', label: 'B', color: 2 },
        ]}
      />,
    );
    const zeroLine = Array.from(container.querySelectorAll('line')).find(
      (l) => l.getAttribute('stroke') === 'var(--chart-axis)',
    );
    const zeroY = Number(zeroLine?.getAttribute('y1'));
    for (const rect of Array.from(
      container.querySelectorAll('rect[data-series]'),
    )) {
      expect(Number(rect.getAttribute('y'))).toBeGreaterThanOrEqual(
        zeroY - 0.01,
      );
    }
    for (const path of Array.from(
      container.querySelectorAll('path[data-series]'),
    )) {
      expect(path.getAttribute('data-rounded')).toBe('down');
      const ys =
        (path.getAttribute('d') ?? '')
          .match(/[\d.]+,([\d.]+)/g)
          ?.map((p) => Number(p.split(',')[1])) ?? [];
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(zeroY - 0.01);
    }
  });

  it('thins category labels at a narrow width', () => {
    cleanup();
    stubResizeObserver(300);
    const years = Array.from({ length: 30 }, (_, i) => ({
      x: `Yr ${i + 1}`,
      a: 1,
    }));
    const { container } = render(
      <StackedBarChart
        title="Narrow"
        data={years}
        series={[{ key: 'a', label: 'A', color: 1 }]}
      />,
    );
    const labels = Array.from(container.querySelectorAll('text')).filter((t) =>
      t.textContent?.startsWith('Yr'),
    );
    expect(labels.length).toBeLessThanOrEqual(4);
    expect(labels[0].textContent).toBe('Yr 1');
  });
});
