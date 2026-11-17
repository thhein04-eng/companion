import { linePath, roundedTopRect } from './paths';

describe('linePath', () => {
  it('draws a simple polyline', () => {
    expect(
      linePath([
        { x: 0, y: 0 },
        { x: 10, y: 5 },
      ]),
    ).toBe('M0,0L10,5');
  });

  it('starts a new subpath after a null gap', () => {
    const d = linePath([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      null,
      { x: 3, y: 3 },
      { x: 4, y: 4 },
    ]);
    expect(d).toBe('M0,0L1,1M3,3L4,4');
    expect(d.match(/M/g)).toHaveLength(2);
  });

  it('returns an empty string for all-null input', () => {
    expect(linePath([null, null])).toBe('');
  });
});

describe('roundedTopRect', () => {
  it('rounds the top corners and keeps the bottom square', () => {
    const d = roundedTopRect(0, 0, 24, 100, 4);
    expect(d).toContain('Q');
    // Bottom edge is a straight line between the two bottom corners.
    expect(d).toContain('L24,100');
    expect(d).toContain('L0,100');
  });

  it('rounds the bottom when direction is down', () => {
    const d = roundedTopRect(0, 0, 24, 100, 4, 'down');
    expect(d).toContain('Q');
    // Top edge is square.
    expect(d.startsWith('M0,0L24,0')).toBe(true);
  });

  it('clamps the radius to min(r, w/2, h)', () => {
    const d = roundedTopRect(0, 0, 24, 2, 4);
    // With h = 2 the radius is 2, so the curve starts 2px in from the left edge.
    expect(d).toContain('Q0,0 2,0');
    expect(d).not.toContain('NaN');
  });

  it('returns an empty path for zero height', () => {
    expect(roundedTopRect(0, 0, 24, 0, 4)).toBe('');
  });
});
