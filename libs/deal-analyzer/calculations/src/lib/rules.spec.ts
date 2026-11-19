import { describe, expect, it } from 'vitest';
import { onePercentRatio } from './rules';

describe('onePercentRatio (spec 011 data-model)', () => {
  it('is rent ÷ price: $3,200 rent on a $450,000 price ≈ 0.711%', () => {
    expect(
      onePercentRatio({ pass: false, targetRent: 4_500, actualRent: 3_200 }),
    ).toBeCloseTo(0.0071111, 6);
  });

  it('is exactly 1% when rent meets the target', () => {
    expect(
      onePercentRatio({ pass: true, targetRent: 4_500, actualRent: 4_500 }),
    ).toBe(0.01);
  });

  it('is null with no target (no price)', () => {
    expect(
      onePercentRatio({ pass: false, targetRent: 0, actualRent: 3_200 }),
    ).toBeNull();
  });
});
