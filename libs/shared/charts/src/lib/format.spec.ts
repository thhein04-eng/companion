import { capSeries, formatCompactCurrency } from './format';
import type { SeriesDef } from './types';

describe('formatCompactCurrency', () => {
  it.each([
    [1_234_567, '$1.2M'],
    [350_000, '$350K'],
    [900, '$900'],
    [0, '$0'],
    [-12_000, '-$12K'],
  ])('%d → %s', (input, expected) => {
    expect(formatCompactCurrency(input)).toBe(expected);
  });
});

describe('capSeries', () => {
  const make = (n: number): SeriesDef[] =>
    Array.from({ length: n }, (_, i) => ({
      key: `s${i}`,
      label: `S${i}`,
      color: 1,
    }));

  it('keeps the first 8 in order', () => {
    const nine = make(9);
    const { shown, hiddenCount } = capSeries(nine, 8);
    expect(shown).toEqual(nine.slice(0, 8));
    expect(hiddenCount).toBe(1);
  });

  it('reports nothing hidden when under the cap', () => {
    expect(capSeries(make(3)).hiddenCount).toBe(0);
  });
});
