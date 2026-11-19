import { describe, expect, it } from 'vitest';
import { dealChangeTitle } from './deal-change-toast';

describe('dealChangeTitle (spec 010 FR-030, spec 013 T008)', () => {
  it('shows old → new for a single shared input', () => {
    expect(
      dealChangeTitle({
        field: 'annualInterestRatePct',
        label: 'Rate',
        oldDisplay: '6.5%',
        newDisplay: '6%',
      }),
    ).toBe('Rate changed 6.5% → 6%');
  });

  it('names rental-panel changes without values', () => {
    expect(
      dealChangeTitle({
        field: 'rental',
        label: 'Rental inputs',
        oldDisplay: '',
        newDisplay: '',
      }),
    ).toBe('Rental inputs changed');
  });

  it('names sale changes without an empty arrow', () => {
    expect(
      dealChangeTitle({
        field: 'sale',
        label: 'Sale inputs',
        oldDisplay: '',
        newDisplay: '',
      }),
    ).toBe('Sale inputs changed');
  });
});
