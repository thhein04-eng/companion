import { describe, expect, it } from 'vitest';
import { irr } from './irr';

const npv = (r: number, flows: number[]) =>
  flows.reduce((sum, cf, t) => sum + cf / (1 + r) ** t, 0);

describe('irr (spec 009 R4)', () => {
  it.each([
    [[-100, 110], 0.1],
    [[-1000, 300, 400, 500], 0.0889633947],
    [[-100, 0, 0, 133.1], 0.1],
  ])('%j → %d', (flows, expected) => {
    expect(irr(flows)).toBeCloseTo(expected, 9);
  });

  it.each([[[100, 10]], [[0, 0]], [[]]])('%j → null', (flows) => {
    expect(irr(flows)).toBeNull();
  });

  // Spec 009 T008 listed [-100, -10, 50] → null "(no root in the bracket)", but it has a real
  // root at r ≈ −34.11% (50x² − 10x − 100 = 0, x = 1/(1+r)) inside [−0.99, 10], which R4's
  // bracket-and-bisect finds. The algorithm is kept and the expectation corrected (tasks.md notes).
  it('finds a negative IRR when the root is inside the bracket', () => {
    expect(irr([-100, -10, 50])).toBeCloseTo(-0.3411, 4);
  });

  it('puts NPV at the result within 1e-6', () => {
    const flows = [-1000, 300, 400, 500];
    expect(Math.abs(npv(irr(flows) as number, flows))).toBeLessThan(1e-6);
  });
});
