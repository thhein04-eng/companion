import { describe, expect, it } from 'vitest';
import {
  DEAL_FIELD_LABELS,
  dealFieldPatch,
  formatDealField,
  formatRentWithUnits,
  readDealField,
  type DealFieldKey,
} from './deal-fields';
import { DEFAULT_RENTAL_ASSUMPTIONS } from './rental-defaults';
import type { LoanScenario, RentalAssumptions, RentUnit } from './types';

const base: LoanScenario = {
  id: 's1',
  name: 'Scenario 1',
  principal: 360_000,
  annualInterestRatePct: 6.5,
  termMonths: 360,
  startDate: '2027-01-01',
  paymentFrequency: 'monthly',
  homePrice: 450_000,
  downPayment: { percent: 20 },
  annualPropertyTax: 5_400,
  annualInsurance: 1_800,
  pmiAnnualRatePct: 0.5,
  monthlyHoa: 120,
  extraPayments: [],
  rental: null,
  principalIsOverridden: false,
};

describe('readDealField', () => {
  it('reads scenario fields', () => {
    expect(readDealField(base, 'homePrice')).toBe(450_000);
    expect(readDealField(base, 'downPayment')).toEqual({ percent: 20 });
    expect(readDealField(base, 'principal')).toBe(360_000);
    expect(readDealField(base, 'annualInterestRatePct')).toBe(6.5);
    expect(readDealField(base, 'termMonths')).toBe(360);
    expect(readDealField(base, 'startDate')).toBe('2027-01-01');
    expect(readDealField(base, 'annualPropertyTax')).toBe(5_400);
    expect(readDealField(base, 'annualInsurance')).toBe(1_800);
    expect(readDealField(base, 'pmiAnnualRatePct')).toBe(0.5);
    expect(readDealField(base, 'monthlyHoa')).toBe(120);
  });

  it('reads an amount down payment', () => {
    expect(
      readDealField(
        { ...base, downPayment: { amount: 90_000 } },
        'downPayment',
      ),
    ).toEqual({ amount: 90_000 });
  });

  it('reads rental fields, and null when there is no rental', () => {
    expect(readDealField(base, 'rental.grossMonthlyRent')).toBeNull();
    const withRental = {
      ...base,
      rental: { ...DEFAULT_RENTAL_ASSUMPTIONS, grossMonthlyRent: 3_200 },
    };
    expect(readDealField(withRental, 'rental.grossMonthlyRent')).toBe(3_200);
    expect(readDealField(withRental, 'rental.vacancyPct')).toBe(5);
  });
});

describe('dealFieldPatch', () => {
  it('patches plain scenario fields', () => {
    expect(dealFieldPatch(base, 'annualInterestRatePct', 6)).toEqual({
      annualInterestRatePct: 6,
    });
    expect(dealFieldPatch(base, 'termMonths', 180)).toEqual({
      termMonths: 180,
    });
    expect(dealFieldPatch(base, 'downPayment', { amount: 1 })).toEqual({
      downPayment: { amount: 1 },
    });
  });

  it('seeds the rental defaults on the first rent entry, as the rental editor does', () => {
    expect(dealFieldPatch(base, 'rental.grossMonthlyRent', 3_200)).toEqual({
      rental: { ...DEFAULT_RENTAL_ASSUMPTIONS, grossMonthlyRent: 3_200 },
    });
  });

  it('ignores other rental fields while there is no rental', () => {
    expect(dealFieldPatch(base, 'rental.vacancyPct', 7)).toEqual({});
  });

  it('merges into an existing rental', () => {
    const rental = { ...DEFAULT_RENTAL_ASSUMPTIONS, grossMonthlyRent: 3_200 };
    expect(dealFieldPatch({ ...base, rental }, 'rental.vacancyPct', 7)).toEqual(
      {
        rental: { ...rental, vacancyPct: 7 },
      },
    );
  });
});

describe('formatDealField', () => {
  it.each<[DealFieldKey, unknown, string]>([
    ['homePrice', 450_000, '$450,000'],
    ['downPayment', { percent: 20 }, '20%'],
    ['downPayment', { amount: 90_000 }, '$90,000'],
    ['annualInterestRatePct', 6.5, '6.5%'],
    ['annualInterestRatePct', 6, '6%'],
    ['annualInterestRatePct', 6.4375, '6.4375%'],
    ['downPayment', { percent: 20.55 }, '20.55%'],
    ['homePrice', 347_512.34, '$347,512.34'],
    ['termMonths', 360, '30 yr'],
    ['termMonths', 18, '18 mo'],
    ['rental.grossMonthlyRent', 3_200, '$3,200'],
    ['monthlyHoa', 120.5, '$120.50'],
    ['homePrice', null, '—'],
  ])('%s %j → %s', (key, value, expected) => {
    expect(formatDealField(key, value)).toBe(expected);
  });
});

it('labels every chip field', () => {
  expect(DEAL_FIELD_LABELS.homePrice).toBe('Home price');
  expect(DEAL_FIELD_LABELS.downPayment).toBe('Down payment');
  expect(DEAL_FIELD_LABELS.principal).toBe('Loan amount');
  expect(DEAL_FIELD_LABELS.annualInterestRatePct).toBe('Rate');
  expect(DEAL_FIELD_LABELS.termMonths).toBe('Term');
  expect(DEAL_FIELD_LABELS['rental.grossMonthlyRent']).toBe('Rent');
});

describe('rent roll (spec 012 T011)', () => {
  const unit = (over: Partial<RentUnit> & { id: string }): RentUnit => ({
    name: `Unit ${over.id.toUpperCase()}`,
    bedrooms: null,
    bathrooms: null,
    rent: 0,
    vacancyPct: null,
    ownerOccupied: false,
    rentAfterMoveOut: null,
    ...over,
  });
  const withRental = (rental: Partial<RentalAssumptions>): LoanScenario =>
    ({
      rental: { ...DEFAULT_RENTAL_ASSUMPTIONS, grossMonthlyRent: 0, ...rental },
    }) as LoanScenario;
  const duplex = (
    a: Partial<RentUnit> = {},
    over: Partial<RentalAssumptions> = {},
  ) =>
    withRental({
      grossMonthlyRent: 2_750,
      units: [
        unit({ id: 'a', rent: 1_350, ...a }),
        unit({ id: 'b', rent: 1_400 }),
      ],
      ...over,
    });
  const owner = { ownerOccupied: true, rentAfterMoveOut: 1_350 };

  it('reads Rent as the rent roll total in the current view', () => {
    expect(readDealField(duplex(), 'rental.grossMonthlyRent')).toBe(2_750);
    expect(readDealField(duplex(owner), 'rental.grossMonthlyRent')).toBe(1_400);
    expect(
      readDealField(
        duplex(owner, { occupancyView: 'afterMoveOut' }),
        'rental.grossMonthlyRent',
      ),
    ).toBe(2_750);
  });

  it('formats the rent with the unit count, per view', () => {
    const r = (s: LoanScenario) => s.rental as RentalAssumptions;
    expect(formatRentWithUnits(r(duplex()))).toBe('$2,750 · 2 units');
    expect(formatRentWithUnits(r(duplex(owner)))).toBe('$1,400 · 2 units');
    expect(formatRentWithUnits(r(duplex(owner)), 'afterMoveOut')).toBe(
      '$2,750 · 2 units',
    );
    expect(
      formatRentWithUnits(r(withRental({ grossMonthlyRent: 2_750 }))),
    ).toBe('$2,750');
  });

  it('edits Unit A’s rent through the single-rent popover, keeping the total in sync', () => {
    const one = withRental({
      grossMonthlyRent: 2_000,
      units: [unit({ id: 'a', rent: 2_000 })],
    });
    const patch = dealFieldPatch(one, 'rental.grossMonthlyRent', 2_100);
    expect(patch.rental?.grossMonthlyRent).toBe(2_100);
    expect(patch.rental?.units?.[0].rent).toBe(2_100);
  });

  it('ignores a single-number rent edit for a larger or house-hacked rent roll', () => {
    expect(dealFieldPatch(duplex(), 'rental.grossMonthlyRent', 3_000)).toEqual(
      {},
    );
    const hacked = withRental({ units: [unit({ id: 'a', ...owner })] });
    expect(dealFieldPatch(hacked, 'rental.grossMonthlyRent', 3_000)).toEqual(
      {},
    );
  });
});
