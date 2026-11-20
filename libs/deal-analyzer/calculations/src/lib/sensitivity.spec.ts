import {
  computeSchedule,
  roundCents,
  type LoanScenario,
  type RentUnit,
} from 'shared-calculations';
import { describe, expect, it } from 'vitest';
import { referenceScenario } from './__fixtures__/dscr-reference';
import { analyzeDeal } from './analyze-deal';
import {
  buildSensitivityGrid,
  evaluateVariant,
  rateRows,
  scenarioVariant,
} from './sensitivity';

/**
 * Spec 015 calculations (Constitution I), to the cent.
 * Reference deal: $400,000 price, 25% down ($100,000), loan $300,000 at 7% / 30yr, tax $4,800,
 * insurance $1,800, rent $3,800.
 */
const analyze = (s: LoanScenario) => analyzeDeal(s, computeSchedule(s));

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

describe('scenarioVariant (spec 015 data-model §C)', () => {
  it('with no change is the scenario itself, so the center cell equals the Deal Analyzer', () => {
    const s = referenceScenario();
    expect(scenarioVariant(s, {})).toEqual(s);
    expect(scenarioVariant(s, { priceChangePct: 0, rentChangePct: 0 })).toEqual(
      s,
    );
    expect(
      analyze(scenarioVariant(s, { ratePct: s.annualInterestRatePct })),
    ).toEqual(analyze(s));
  });

  it('replaces only the rate', () => {
    const s = referenceScenario();
    expect(scenarioVariant(s, { ratePct: 5.5 })).toEqual({
      ...s,
      annualInterestRatePct: 5.5,
    });
  });

  it('moves the loan with the price, keeping a percentage down payment: −10% gives $270,000', () => {
    const v = scenarioVariant(referenceScenario(), { priceChangePct: -10 });
    expect(v.homePrice).toBe(360_000);
    expect(v.principal).toBe(270_000); // 75% of $360,000
    expect(v.downPayment).toEqual({ percent: 25 });
  });

  it('keeps a fixed-dollar down payment, so the loan absorbs the change', () => {
    const s = referenceScenario({
      downPayment: { amount: 100_000 },
    });
    const v = scenarioVariant(s, { priceChangePct: 5 });
    expect(v.homePrice).toBe(420_000);
    expect(v.principal).toBe(320_000);
    expect(v.downPayment).toEqual({ amount: 100_000 });
  });

  it('keeps a directly entered loan as the starting point', () => {
    const s = referenceScenario({
      principal: 280_000,
      principalIsOverridden: true,
    });
    const v = scenarioVariant(s, { priceChangePct: 10 });
    // $40,000 more price, 75% of it financed: +$30,000.
    expect(v.principal).toBe(310_000);
    expect(v.principalIsOverridden).toBe(true);
  });

  it('accepts an absolute price (used by the offer solver)', () => {
    const v = scenarioVariant(referenceScenario(), { price: 300_000 });
    expect(v.homePrice).toBe(300_000);
    expect(v.principal).toBe(225_000);
  });

  it('scales a single rent and leaves other income and every other input alone', () => {
    const s = referenceScenario({}, { otherMonthlyIncome: 150 });
    const v = scenarioVariant(s, { rentChangePct: -10 });
    expect(v.rental?.grossMonthlyRent).toBe(3_420);
    expect(v.rental?.otherMonthlyIncome).toBe(150);
    expect({ ...v, rental: null }).toEqual({ ...s, rental: null });
  });

  it('scales every unit of a rent roll and the owner’s rent after move-out', () => {
    const s = referenceScenario(
      {},
      {
        grossMonthlyRent: 2_750,
        units: [
          unit({
            id: 'a',
            rent: 0,
            ownerOccupied: true,
            rentAfterMoveOut: 1_350,
          }),
          unit({ id: 'b', rent: 1_400 }),
        ],
      },
    );
    const v = scenarioVariant(s, { rentChangePct: 10 });
    expect(v.rental?.units?.map((u) => [u.rent, u.rentAfterMoveOut])).toEqual([
      [0, 1_485],
      [1_540, null],
    ]);
    expect(v.rental?.grossMonthlyRent).toBe(3_025);
  });

  it('does not mutate its input', () => {
    const s = referenceScenario();
    const copy = structuredClone(s);
    scenarioVariant(s, { ratePct: 9, priceChangePct: 10, rentChangePct: -10 });
    expect(s).toEqual(copy);
  });
});

describe('evaluateVariant', () => {
  it('gives the same figures as analyzeDeal', () => {
    const s = referenceScenario();
    const d = analyze(s);
    expect(evaluateVariant(s)).toEqual({
      cashFlowMonthly: d.cashFlow.monthly,
      cashOnCash: d.cashOnCashReturn.value,
      naReason: null,
    });
  });

  it('is n/a for Cash-on-Cash when nothing is invested, keeping the cash flow', () => {
    const s = referenceScenario({ downPayment: { amount: 0 } });
    const r = evaluateVariant(s);
    expect(r.cashOnCash).toBeNull();
    expect(r.naReason).toContain('No cash invested');
    expect(r.cashFlowMonthly).toBe(analyze(s).cashFlow.monthly);
  });

  it('is n/a for both measures when the variant is not a valid scenario', () => {
    // A $380,000 down payment is valid at $400,000 but not at $360,000.
    const s = referenceScenario({
      downPayment: { amount: 380_000 },
      principal: 20_000,
    });
    expect(evaluateVariant(s).cashFlowMonthly).not.toBeNull();
    const v = scenarioVariant(s, { priceChangePct: -10 });
    const r = evaluateVariant(v);
    expect(r.cashFlowMonthly).toBeNull();
    expect(r.cashOnCash).toBeNull();
    expect(r.naReason).toBeTruthy();
  });
});

describe('rateRows (research R5)', () => {
  it('is the rate ±2 steps with the deal in the middle', () => {
    expect(rateRows(6.5, 0.5)).toEqual({
      rows: [5.5, 6, 6.5, 7, 7.5],
      currentIndex: 2,
    });
    expect(rateRows(7, 0.25)).toEqual({
      rows: [6.5, 6.75, 7, 7.25, 7.5],
      currentIndex: 2,
    });
    expect(rateRows(7, 1)).toEqual({ rows: [5, 6, 7, 8, 9], currentIndex: 2 });
  });

  it('never goes below 0%: the deal moves up but stays one rate plus whole steps', () => {
    expect(rateRows(0.5, 1)).toEqual({
      rows: [0.5, 1.5, 2.5, 3.5, 4.5],
      currentIndex: 0,
    });
    expect(rateRows(0.75, 0.5)).toEqual({
      rows: [0.25, 0.75, 1.25, 1.75, 2.25],
      currentIndex: 1,
    });
    expect(rateRows(0, 0.25)).toEqual({
      rows: [0, 0.25, 0.5, 0.75, 1],
      currentIndex: 0,
    });
  });

  it('keeps every row non-negative and the current rate in place for any rate', () => {
    for (const rate of [0, 0.1, 0.49, 1, 1.2, 3.3, 6.37, 12.5]) {
      for (const step of [0.25, 0.5, 1]) {
        const { rows, currentIndex } = rateRows(rate, step);
        expect(rows).toHaveLength(5);
        expect(rows.every((r) => r >= 0)).toBe(true);
        expect(rows[currentIndex]).toBe(rate);
      }
    }
  });

  it('rounds away floating-point noise', () => {
    expect(rateRows(6.37, 0.25).rows).toEqual([5.87, 6.12, 6.37, 6.62, 6.87]);
  });
});

/** Spec 002's reference vector: $250,000, 25% down, 7% / 30yr, tax $3,000, insurance $1,200, rent $2,400. */
const vectorA = (over: Partial<LoanScenario> = {}) =>
  referenceScenario(
    {
      homePrice: 250_000,
      principal: 187_500,
      annualInterestRatePct: 7,
      annualPropertyTax: 3_000,
      annualInsurance: 1_200,
      ...over,
    },
    { grossMonthlyRent: 2_400 },
  );

describe('buildSensitivityGrid (spec 015 data-model §D)', () => {
  const grid = (
    s: LoanScenario,
    over: Partial<Parameters<typeof buildSensitivityGrid>[1]> = {},
  ) =>
    buildSensitivityGrid(s, {
      columnVariable: 'price',
      rateStepPct: 0.5,
      columnStepPct: 5,
      ...over,
    });

  it('has the center cell equal to the Deal Analyzer, field for field (SC-001)', () => {
    for (const s of [
      vectorA(),
      referenceScenario(),
      vectorA({
        downPayment: { percent: 10 },
        principal: 225_000,
        pmiAnnualRatePct: 0.5,
      }),
    ]) {
      const g = grid(s);
      const a = analyze(s);
      const center = g.cells[g.current.row][g.current.column];
      expect(g.current).toEqual({ row: 2, column: 2 });
      expect(center.cashFlowMonthly).toBe(a.cashFlow.monthly);
      expect(center.cashOnCash).toBe(a.cashOnCashReturn.value);
    }
    expect(grid(vectorA()).cells[2][2].cashFlowMonthly).toBe(250.56);
  });

  it('has every one of the 25 cells equal to a deal re-entered by hand (price and rent)', () => {
    const s = vectorA();
    const rates = [6, 6.5, 7, 7.5, 8];
    const pcts = [-10, -5, 0, 5, 10];
    const byHand = (rate: number, pct: number, variable: 'price' | 'rent') => {
      const price =
        variable === 'price' ? roundCents(250_000 * (1 + pct / 100)) : 250_000;
      const rent =
        variable === 'rent' ? roundCents(2_400 * (1 + pct / 100)) : 2_400;
      return analyze(
        referenceScenario(
          {
            homePrice: price,
            principal: price * 0.75,
            annualInterestRatePct: rate,
            annualPropertyTax: 3_000,
            annualInsurance: 1_200,
          },
          { grossMonthlyRent: rent },
        ),
      );
    };
    for (const variable of ['price', 'rent'] as const) {
      const g = grid(s, { columnVariable: variable });
      expect(g.rows.map((r) => r.ratePct)).toEqual(rates);
      rates.forEach((rate, r) =>
        pcts.forEach((pct, c) => {
          const a = byHand(rate, pct, variable);
          expect(g.cells[r][c].cashFlowMonthly).toBe(a.cashFlow.monthly);
          expect(g.cells[r][c].cashOnCash).toBe(a.cashOnCashReturn.value);
          expect(g.cells[r][c].ratePct).toBe(rate);
          expect(g.cells[r][c].columnPct).toBe(pct);
        }),
      );
    }
  });

  it('labels the columns with the change and the resulting price or rent', () => {
    const price = grid(vectorA());
    expect(price.columns.map((c) => c.label)).toEqual([
      '−10%',
      '−5%',
      '0%',
      '+5%',
      '+10%',
    ]);
    expect(price.columns.map((c) => c.amount)).toEqual([
      225_000, 237_500, 250_000, 262_500, 275_000,
    ]);
    const rent = grid(vectorA(), { columnVariable: 'rent' });
    expect(rent.columns.map((c) => c.amount)).toEqual([
      2_160, 2_280, 2_400, 2_520, 2_640,
    ]);
    expect(price.columnVariable).toBe('price');
  });

  it('widens the ranges with the step sizes and keeps the deal in the middle', () => {
    const g = grid(vectorA(), { rateStepPct: 1, columnStepPct: 10 });
    expect(g.rows.map((r) => r.ratePct)).toEqual([5, 6, 7, 8, 9]);
    expect(g.columns.map((c) => c.pct)).toEqual([-20, -10, 0, 10, 20]);
    expect(g.current).toEqual({ row: 2, column: 2 });
    expect(
      grid(vectorA(), { columnStepPct: 2.5 }).columns.map((c) => c.pct),
    ).toEqual([-5, -2.5, 0, 2.5, 5]);
  });

  it('moves the current row up near 0%, and the current cell is still the unchanged deal', () => {
    const s = vectorA({ annualInterestRatePct: 0.5 });
    const g = grid(s, { rateStepPct: 1 });
    expect(g.rows.map((r) => r.ratePct)).toEqual([0.5, 1.5, 2.5, 3.5, 4.5]);
    expect(g.current).toEqual({ row: 0, column: 2 });
    expect(g.cells[0][2].cashFlowMonthly).toBe(analyze(s).cashFlow.monthly);
  });

  it('uses the deal’s exact rate for the current row even with many decimals', () => {
    const s = vectorA({ annualInterestRatePct: 6.123456 });
    const g = grid(s);
    expect(g.rows[g.current.row].ratePct).toBe(6.123456);
    expect(g.cells[g.current.row][g.current.column].cashFlowMonthly).toBe(
      analyze(s).cashFlow.monthly,
    );
  });

  it('gives n/a Cash-on-Cash, with the reason, when nothing is invested', () => {
    const g = grid(vectorA({ downPayment: { amount: 0 } }));
    for (const cell of g.cells.flat()) {
      expect(cell.cashOnCash).toBeNull();
      expect(cell.naReason).toContain('No cash invested');
      expect(cell.cashFlowMonthly).not.toBeNull();
    }
  });

  it('gives n/a cells where a fixed down payment no longer fits under the price', () => {
    const s = vectorA({ downPayment: { amount: 240_000 }, principal: 10_000 });
    const g = grid(s);
    for (let r = 0; r < 5; r++) {
      expect([0, 1].map((c) => g.cells[r][c].cashFlowMonthly)).toEqual([
        null,
        null,
      ]);
      expect(g.cells[r][0].naReason).toBeTruthy();
      expect(
        [2, 3, 4].every((c) => g.cells[r][c].cashFlowMonthly !== null),
      ).toBe(true);
    }
  });

  it('marks cells against the target’s own measure, and not at all without one', () => {
    const s = vectorA();
    expect(
      grid(s)
        .cells.flat()
        .every((c) => c.meetsTarget === null),
    ).toBe(true);
    const cf = grid(s, { target: { measure: 'cashFlow', value: 300 } });
    for (const c of cf.cells.flat())
      expect(c.meetsTarget).toBe((c.cashFlowMonthly ?? 0) >= 300);
    expect(cf.cells[2][2].meetsTarget).toBe(false); // $250.56 < $300
    const coc = grid(s, { target: { measure: 'cashOnCash', value: 5 } });
    for (const c of coc.cells.flat())
      expect(c.meetsTarget).toBe((c.cashOnCash ?? 0) >= 0.05);
    const invalid = grid(
      vectorA({ downPayment: { amount: 240_000 }, principal: 10_000 }),
      {
        target: { measure: 'cashFlow', value: 0 },
      },
    );
    expect(invalid.cells[0][0].meetsTarget).toBeNull();
  });

  it('shows the rent in the scenario’s current view for a house-hack (spec 012)', () => {
    const s = referenceScenario(
      {},
      {
        grossMonthlyRent: 2_750,
        units: [
          unit({ id: 'a', ownerOccupied: true, rentAfterMoveOut: 1_350 }),
          unit({ id: 'b', rent: 1_400 }),
        ],
      },
    );
    const living = grid(s, { columnVariable: 'rent' });
    expect(living.columns.map((c) => c.amount)).toEqual([
      1_260, 1_330, 1_400, 1_470, 1_540,
    ]);
    const afterRental = {
      ...referenceScenario().rental,
      ...s.rental,
      occupancyView: 'afterMoveOut' as const,
    } as NonNullable<LoanScenario['rental']>;
    const after = grid(
      { ...s, rental: afterRental },
      { columnVariable: 'rent' },
    );
    expect(after.columns[2].amount).toBe(2_750);
  });

  it('tags the column nearest the max offer when it is in range (price columns only)', () => {
    const s = vectorA();
    expect(grid(s, { maxOfferPrice: 231_500 }).maoColumn).toEqual({
      index: 1,
      pct: (231_500 / 250_000 - 1) * 100,
      price: 231_500,
    });
    expect(grid(s, { maxOfferPrice: 200_000 }).maoColumn).toBeNull(); // −20%: out of range
    expect(
      grid(s, { maxOfferPrice: 231_500, columnVariable: 'rent' }).maoColumn,
    ).toBeNull();
    expect(grid(s).maoColumn).toBeNull();
    expect(grid(s, { maxOfferPrice: null }).maoColumn).toBeNull();
  });

  it('builds a full grid in under 100 ms on the reference deal (SC-004)', () => {
    const started = performance.now();
    grid(vectorA(), {
      target: { measure: 'cashFlow', value: 300 },
      maxOfferPrice: 231_500,
    });
    expect(performance.now() - started).toBeLessThan(100);
  });
});
