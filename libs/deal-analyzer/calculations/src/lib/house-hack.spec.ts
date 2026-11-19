import {
  computeSchedule,
  type LoanScenario,
  type RentalAssumptions,
  type RentUnit,
} from 'shared-calculations';
import { describe, expect, it } from 'vitest';
import { referenceScenario } from './__fixtures__/dscr-reference';
import { analyzeDeal } from './analyze-deal';
import { projectExit } from './project-exit';
import { projectRental } from './project-rental';
import { projectWealth } from './project-wealth';

/**
 * Spec 012 calculations (T008/T009, Constitution I), to the cent against hand calculations.
 *
 * Reference loan: $300,000 at 7% for 30 years → P&I $1,995.91/mo ($23,950.92/yr), no PMI.
 * Fixed costs: tax $400 + insurance $150 = $550/mo. Defaults: vacancy 5%, management 8%,
 * maintenance 5%, CapEx 5% (23% of rent).
 */
const unit = (over: Partial<RentUnit> & { id: string }): RentUnit => ({
  name: `Unit ${over.id.toUpperCase()}`,
  bedrooms: 2,
  bathrooms: 1,
  rent: 0,
  vacancyPct: null,
  ownerOccupied: false,
  rentAfterMoveOut: null,
  ...over,
});

function duplex(
  a: Partial<RentUnit> = {},
  b: Partial<RentUnit> = {},
  rental: Partial<RentalAssumptions> = {},
): LoanScenario {
  return referenceScenario(
    {},
    {
      grossMonthlyRent: 2_750,
      units: [
        unit({ id: 'a', rent: 1_350, ...a }),
        unit({ id: 'b', rent: 1_400, ...b }),
      ],
      ...rental,
    },
  );
}

const owner = { ownerOccupied: true, rentAfterMoveOut: 1_350 };
const analyze = (s: LoanScenario, view?: 'living' | 'afterMoveOut') =>
  analyzeDeal(s, computeSchedule(s), view ? { view } : {});
const water = (paidBy: 'landlord' | 'rubs') => ({
  vacancyPct: 0,
  customExpenses: [
    { id: 'w', label: 'Water/Sewer', monthlyAmount: 180, paidBy },
  ],
});

/** The parts of the analysis that exist without a rent roll (pre-spec-012 fields). */
const core = (d: ReturnType<typeof analyzeDeal>) => {
  const { view, income, unitBreakdown, netHousingCost, ...rest } = d;
  void view;
  void income;
  void unitBreakdown;
  void netHousingCost;
  return rest;
};

describe('analyzeDeal with a rent roll (spec 012 T008)', () => {
  it('after move-out equals the same deal with a single $2,750 rent', () => {
    const single = analyze(referenceScenario({}, { grossMonthlyRent: 2_750 }));
    const d = analyze(duplex(owner), 'afterMoveOut');
    expect(core(d)).toEqual(core(single));
    expect(d.netOperatingIncome).toEqual({ monthly: 1_567.5, annual: 18_810 });
    expect(d.cashFlow.annual).toBe(-5_140.92);
  });

  it('living in Unit A: rent $1,400 and net housing cost $1,467.91/mo', () => {
    const d = analyze(duplex(owner), 'living');
    expect(d.view).toBe('living');
    expect(d.income.rent.monthly).toBe(1_400);
    expect(d.totalOperatingExpenses.monthly).toBe(872);
    expect(d.netOperatingIncome).toEqual({ monthly: 528, annual: 6_336 });
    expect(d.cashFlow).toEqual({ monthly: -1_467.91, annual: -17_614.92 });
    expect(d.netHousingCost).toEqual({ monthly: 1_467.91, annual: 17_614.92 });
  });

  it('defaults to the stored view, and "living" for a new house-hack', () => {
    expect(analyze(duplex(owner)).view).toBe('living');
    expect(
      analyze(duplex(owner, {}, { occupancyView: 'afterMoveOut' })).view,
    ).toBe('afterMoveOut');
  });

  it('a positive cash flow while living there is a negative net housing cost (live for free)', () => {
    // Unit B at $4,000: NOI = 0.77 × 4,000 − 550 = $2,530/mo → +$6,409.08/yr.
    const d = analyze(duplex(owner, { rent: 4_000 }), 'living');
    expect(d.cashFlow.annual).toBe(6_409.08);
    expect(d.netHousingCost?.monthly).toBe(-534.09);
  });

  it('RUBS: $180 water raises NOI by $180 after move-out and $90 living there', () => {
    const after = (paidBy: 'landlord' | 'rubs') =>
      analyze(duplex(owner, {}, water(paidBy)), 'afterMoveOut');
    const living = (paidBy: 'landlord' | 'rubs') =>
      analyze(duplex(owner, {}, water(paidBy)), 'living');
    // After move-out: opex = 550 + 180 + 18% × 2,750 = 1,225.
    expect(after('landlord').netOperatingIncome.monthly).toBe(1_525);
    expect(after('rubs').netOperatingIncome.monthly).toBe(1_705);
    expect(after('rubs').income.reimbursements.monthly).toBe(180);
    // The expense stays at its full amount (FR-019).
    expect(after('rubs').totalOperatingExpenses.monthly).toBe(1_225);
    // Living there: opex = 550 + 180 + 18% × 1,400 = 982.
    expect(living('landlord').netOperatingIncome.monthly).toBe(418);
    expect(living('rubs').netOperatingIncome.monthly).toBe(508);
  });

  it('judges the 1% and 50% rules on the full rent in both views (FR-015)', () => {
    const living = analyze(duplex(owner), 'living');
    const after = analyze(duplex(owner), 'afterMoveOut');
    expect(living.onePercentRule).toEqual(after.onePercentRule);
    expect(living.onePercentRule?.actualRent).toBe(2_750);
    expect(living.fiftyPercentRule).toEqual(after.fiftyPercentRule);
  });

  it('a single unit the owner lives in earns $0 while living there', () => {
    const s = referenceScenario(
      {},
      {
        grossMonthlyRent: 2_000,
        units: [
          unit({ id: 'a', ownerOccupied: true, rentAfterMoveOut: 2_000 }),
        ],
      },
    );
    expect(analyze(s, 'living').income.rent.monthly).toBe(0);
    expect(analyze(s, 'afterMoveOut').income.rent.monthly).toBe(2_000);
  });

  it('without an owner unit: no view, no net housing cost; a breakdown for 2+ units', () => {
    const d = analyze(duplex({}, { vacancyPct: 10 }));
    expect(d.view).toBeNull();
    expect(d.netHousingCost).toBeNull();
    expect(d.unitBreakdown).toEqual([
      { id: 'a', name: 'Unit A', rent: 1_350, vacancy: 67.5, ratePct: 5 },
      { id: 'b', name: 'Unit B', rent: 1_400, vacancy: 140, ratePct: 10 },
    ]);
    expect(
      d.operatingExpenses.find((l) => l.category === 'vacancy'),
    ).toMatchObject({
      label: 'Vacancy',
      monthly: 207.5,
    });
    expect(analyze(referenceScenario()).unitBreakdown).toEqual([]);
  });
});

describe('projections with a move-out (spec 012 T009)', () => {
  const growth = { rentGrowthPct: 3, expenseGrowthPct: 2 };
  const years = (s: LoanScenario) =>
    projectRental(s, computeSchedule(s)).years.map((y) => y.grossIncome);

  it('moves out after year 1: year 1 living there, year 2 full rent grown once', () => {
    const g = years(duplex(owner, {}, { ...growth, moveOutYears: 1 }));
    expect(g[0]).toBe(16_800); // 1,400 × 12
    expect(g[1]).toBe(33_990); // 2,750 × 1.03 × 12 (Unit A at 1,350 × 1.03)
  });

  it('moves out after year 3: years 1–3 living there, year 4 full rent', () => {
    const g = years(duplex(owner, {}, { ...growth, moveOutYears: 3 }));
    expect(g[2]).toBe(17_823.12); // 1,400 × 1.03² × 12
    expect(g[3]).toBe(36_059.99); // 2,750 × 1.03³ × 12
  });

  it('a move-out after the horizon keeps every shown year living there', () => {
    const s = duplex(
      owner,
      {},
      { ...growth, moveOutYears: 25, wealth: { horizonYears: 10 } },
    );
    const w = projectWealth(s, computeSchedule(s));
    expect(w.moveOutYear).toBe(25);
    expect(years(s)[9]).toBe(21_920.19); // 1,400 × 1.03⁹ (1.304773) × 12
  });

  it('RUBS reimbursements grow with expense growth', () => {
    const noi = (paidBy: 'landlord' | 'rubs') => {
      const s = duplex({}, {}, { ...growth, ...water(paidBy) });
      return projectRental(s, computeSchedule(s)).years[1].noi;
    };
    // Year 2: 180 × 1.02 × 12 = 2,203.20 more NOI.
    expect(noi('rubs') - noi('landlord')).toBeCloseTo(2_203.2, 2);
  });

  it('returns moveOutYear only with an owner unit', () => {
    const plain = duplex();
    expect(projectWealth(plain, computeSchedule(plain)).moveOutYear).toBeNull();
    expect(projectExit(plain, computeSchedule(plain)).moveOutYear).toBeNull();
    const hacked = duplex(owner);
    expect(projectWealth(hacked, computeSchedule(hacked)).moveOutYear).toBe(1);
    expect(projectExit(hacked, computeSchedule(hacked)).moveOutYear).toBe(1);
  });
});
