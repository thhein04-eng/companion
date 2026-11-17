import { bandScale, linearScale, niceTicks, yExtent } from './scales';

describe('linearScale', () => {
  it('maps and inverts', () => {
    const s = linearScale([0, 100], [0, 200]);
    expect(s(50)).toBe(100);
    expect(s.invert(100)).toBe(50);
    expect(s.domain()).toEqual([0, 100]);
    expect(s.range()).toEqual([0, 200]);
  });

  it('maps a zero-width domain to the middle of the range', () => {
    const s = linearScale([5, 5], [0, 200]);
    expect(s(5)).toBe(100);
    expect(s(999)).toBe(100);
  });

  it('supports inverted ranges (SVG y)', () => {
    const s = linearScale([0, 10], [100, 0]);
    expect(s(0)).toBe(100);
    expect(s(10)).toBe(0);
  });
});

describe('bandScale', () => {
  it('gives equal bands in order', () => {
    const b = bandScale(['a', 'b', 'c'], [0, 300], 0.2);
    expect(b.bandwidth).toBeGreaterThan(0);
    expect(b('a')).toBeLessThan(b('b'));
    expect(b('b')).toBeLessThan(b('c'));
    expect(b('b') - b('a')).toBeCloseTo(b('c') - b('b'));
    expect(b('c') + b.bandwidth).toBeLessThanOrEqual(300 + 1e-9);
  });
});

describe('niceTicks', () => {
  it('uses 1/2/5 steps and includes 0', () => {
    expect(niceTicks(0, 296_000, 5)).toEqual([0, 50_000, 100_000, 150_000, 200_000, 250_000, 300_000]);
  });

  it('never returns duplicates for small ranges', () => {
    const ticks = niceTicks(0, 0.4, 5);
    expect(new Set(ticks).size).toBe(ticks.length);
  });

  it('returns at least one tick for a zero-width domain', () => {
    expect(niceTicks(1, 1, 5).length).toBeGreaterThanOrEqual(1);
  });

  it('returns only integers when asked', () => {
    const ticks = niceTicks(0, 11, 8, { integer: true });
    expect(ticks.every((t) => Number.isInteger(t))).toBe(true);
    expect(new Set(ticks).size).toBe(ticks.length);
  });

  it('includes 0 when the domain spans it', () => {
    expect(niceTicks(-12_000, 30_000, 5)).toContain(0);
  });

  it('covers the domain', () => {
    const ticks = niceTicks(-12_000, 30_000, 5);
    expect(ticks[0]).toBeLessThanOrEqual(-12_000);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(30_000);
  });
});

describe('yExtent', () => {
  it('zero-based ignores nulls', () => {
    expect(yExtent([1, 5, null], 'zero-based')).toEqual([0, 5]);
  });

  it('auto includes negatives and 0', () => {
    expect(yExtent([-3, 5], 'auto')).toEqual([-3, 5]);
    expect(yExtent([2, 5], 'auto')).toEqual([0, 5]);
  });

  it('falls back to [0, 1] for empty or all-zero data', () => {
    expect(yExtent([null, null], 'auto')).toEqual([0, 1]);
    expect(yExtent([0, 0], 'zero-based')).toEqual([0, 1]);
  });
});
