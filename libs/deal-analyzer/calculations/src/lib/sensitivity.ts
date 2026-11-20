import {
  computeSchedule,
  currentView,
  normalizeUnits,
  rentRollIncome,
  rentRollTotal,
  roundCents,
  validateScenario,
  type DownPayment,
  type LoanScenario,
} from 'shared-calculations';
import { analyzeDeal } from './analyze-deal';
import type { SensitivityTarget } from './validate-sensitivity';

/** What a grid cell or a solver probe changes about the deal (spec 017 data-model §C). */
export interface VariantChange {
  /** Replaces the annual interest rate, in percent. */
  ratePct?: number;
  /** Replaces the home price (the offer solver). At most one of `price` and `priceChangePct`. */
  price?: number;
  /** Changes the home price by this percent (the grid's price columns). */
  priceChangePct?: number;
  /** Scales every rent by this percent (the grid's rent columns). */
  rentChangePct?: number;
}

/** The down payment in dollars at home price `price` (none counts as $0). */
function downAt(price: number, down: DownPayment | null): number {
  if (down == null) return 0;
  return 'percent' in down ? (price * down.percent) / 100 : down.amount;
}

/**
 * A copy of `scenario` with only the named changes (spec 017 research R1, R3). Everything else
 * stays as entered; with no change the result equals `scenario`, so the grid's center cell is
 * exactly the Deal Analyzer's figure.
 *
 * - **Price**: the loan moves by the part of the change the down payment doesn't cover, so a
 *   percentage down payment keeps its percentage, a fixed one keeps its dollars, and a loan the
 *   investor typed in stays the starting point.
 * - **Rent**: every unit's rent (and the owner's rent after move-out) scales by the same
 *   percentage, rounded to cents; other income is unchanged.
 */
export function scenarioVariant(
  scenario: LoanScenario,
  change: VariantChange,
): LoanScenario {
  let next: LoanScenario = { ...scenario };

  if (change.ratePct !== undefined) {
    next = { ...next, annualInterestRatePct: change.ratePct };
  }

  const base = scenario.homePrice ?? 0;
  const priceChanged =
    change.price !== undefined || (change.priceChangePct ?? 0) !== 0;
  if (priceChanged) {
    const price =
      change.price ??
      roundCents(base * (1 + (change.priceChangePct ?? 0) / 100));
    const financedDelta =
      price -
      downAt(price, scenario.downPayment) -
      (base - downAt(base, scenario.downPayment));
    next = {
      ...next,
      homePrice: price,
      principal: scenario.principal + financedDelta,
    };
  }

  const rental = scenario.rental;
  if (rental && (change.rentChangePct ?? 0) !== 0) {
    const f = 1 + (change.rentChangePct ?? 0) / 100;
    const scale = (x: number) => roundCents(x * f);
    if (rental.units?.length) {
      const units = normalizeUnits(rental).map((u) => ({
        ...u,
        rent: scale(u.rent),
        rentAfterMoveOut:
          u.rentAfterMoveOut == null ? null : scale(u.rentAfterMoveOut),
      }));
      const scaled = { ...rental, units };
      next = {
        ...next,
        rental: { ...scaled, grossMonthlyRent: rentRollTotal(scaled) },
      };
    } else {
      next = {
        ...next,
        rental: { ...rental, grossMonthlyRent: scale(rental.grossMonthlyRent) },
      };
    }
  }

  return next;
}

/** One evaluated deal: both measures, or why they are missing (spec 017 data-model §D). */
export interface VariantResult {
  /** `analyzeDeal(...).cashFlow.monthly`, or null when the variant isn't a valid deal. */
  cashFlowMonthly: number | null;
  /** `analyzeDeal(...).cashOnCashReturn.value` (a fraction), or null (see `naReason`). */
  cashOnCash: number | null;
  naReason: string | null;
}

/**
 * Runs the Deal Analyzer on one variant. A variant that fails scenario validation (for example a
 * fixed down payment that no longer fits under a lower price) is n/a for both measures.
 */
export function evaluateVariant(variant: LoanScenario): VariantResult {
  const validation = validateScenario(variant);
  if (!validation.valid) {
    return {
      cashFlowMonthly: null,
      cashOnCash: null,
      naReason:
        validation.errors[0]?.message ?? 'This combination is not valid.',
    };
  }
  const analysis = analyzeDeal(
    validation.scenario,
    computeSchedule(validation.scenario),
  );
  return {
    cashFlowMonthly: analysis.cashFlow.monthly,
    cashOnCash: analysis.cashOnCashReturn.value,
    naReason: analysis.cashOnCashReturn.naReason,
  };
}

/**
 * Does an evaluated deal meet the target on the target's own measure? `null` when that measure is
 * n/a for the deal. Cash flow compares the displayed monthly figure; Cash-on-Cash compares the
 * exact ratio, with a tiny tolerance for floating-point error (spec 017 FR-012).
 */
export function meetsTarget(
  result: VariantResult,
  target: SensitivityTarget,
): boolean | null {
  if (target.measure === 'cashFlow') {
    return result.cashFlowMonthly == null
      ? null
      : result.cashFlowMonthly >= target.value - 1e-9;
  }
  return result.cashOnCash == null
    ? null
    : result.cashOnCash >= target.value / 100 - 1e-12;
}

const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

/**
 * The grid's five interest-rate rows (spec 017 research R5): the deal's rate plus whole steps,
 * with the deal in the middle, or higher up when that would go below 0%. `currentIndex` is the
 * deal's row.
 */
export function rateRows(
  ratePct: number,
  stepPct: number,
): { rows: number[]; currentIndex: number } {
  // `+ 0` turns a −0 from `ceil` into 0.
  const kMin = Math.max(-2, Math.ceil(-ratePct / stepPct - 1e-9)) + 0;
  const rows = Array.from({ length: 5 }, (_, i) =>
    round4(ratePct + (kMin + i) * stepPct),
  );
  return { rows, currentIndex: 0 - kMin };
}

/** One grid cell: the deal at one rate and one price or rent change (data-model §D). */
export interface SensitivityCell extends VariantResult {
  ratePct: number;
  columnPct: number;
  /** Against the target's own measure; null with no target, or when the cell is n/a. */
  meetsTarget: boolean | null;
}

export interface SensitivityGridColumn {
  /** The change to the price or rent, in percent. */
  pct: number;
  /** The resulting purchase price, or monthly rent in the scenario's current view. */
  amount: number;
  /** The change as text: "−10%", "0%", "+2.5%". */
  label: string;
}

export interface SensitivityGrid {
  rows: { ratePct: number }[];
  columns: SensitivityGridColumn[];
  /** `cells[row][column]`. */
  cells: SensitivityCell[][];
  /** The unchanged deal's cell. */
  current: { row: number; column: number };
  columnVariable: 'price' | 'rent';
  /** The price column nearest the max offer, when the offer is inside the columns' range. */
  maoColumn: { index: number; pct: number; price: number } | null;
}

export interface SensitivityGridOptions {
  columnVariable: 'price' | 'rent';
  /** 0.25 | 0.5 | 1 */
  rateStepPct: number;
  /** 2.5 | 5 | 10 */
  columnStepPct: number;
  target?: SensitivityTarget;
  /** The Max Allowable Offer, to tag the nearest price column. */
  maxOfferPrice?: number | null;
}

const changeLabel = (pct: number) =>
  pct === 0 ? '0%' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`;

/**
 * The 5 × 5 sensitivity grid (spec 017 data-model §D): the deal recalculated for each interest
 * rate (rows) and price or rent change (columns), both measures per cell. Preconditions as
 * `analyzeDeal`: a valid scenario with a valid rental and a down payment. The center cell is the
 * unchanged deal and equals the Deal Analyzer's figures.
 */
export function buildSensitivityGrid(
  scenario: LoanScenario,
  options: SensitivityGridOptions,
): SensitivityGrid {
  const { columnVariable, rateStepPct, columnStepPct, target, maxOfferPrice } =
    options;
  const { rows: rates, currentIndex } = rateRows(
    scenario.annualInterestRatePct,
    rateStepPct,
  );
  // The deal's own row uses its exact rate, whatever rounding the other rows get.
  rates[currentIndex] = scenario.annualInterestRatePct;

  const pcts = [-2, -1, 0, 1, 2].map(
    (k) => Math.round(k * columnStepPct * 10_000) / 10_000,
  );
  const view = scenario.rental ? currentView(scenario.rental) : 'afterMoveOut';
  const changeFor = (pct: number) =>
    columnVariable === 'price'
      ? { priceChangePct: pct }
      : { rentChangePct: pct };

  const columns: SensitivityGridColumn[] = pcts.map((pct) => {
    const variant = scenarioVariant(scenario, changeFor(pct));
    const amount =
      columnVariable === 'price'
        ? (variant.homePrice ?? 0)
        : variant.rental
          ? rentRollIncome(variant.rental, view).rentMonthly
          : 0;
    return { pct, amount, label: changeLabel(pct) };
  });

  const meets = (r: VariantResult): boolean | null =>
    target ? meetsTarget(r, target) : null;

  const cells = rates.map((ratePct) =>
    pcts.map((columnPct): SensitivityCell => {
      const result = evaluateVariant(
        scenarioVariant(scenario, { ratePct, ...changeFor(columnPct) }),
      );
      return { ratePct, columnPct, ...result, meetsTarget: meets(result) };
    }),
  );

  let maoColumn: SensitivityGrid['maoColumn'] = null;
  const price = scenario.homePrice;
  if (columnVariable === 'price' && maxOfferPrice != null && price) {
    const pct = (maxOfferPrice / price - 1) * 100;
    if (pct >= pcts[0] && pct <= pcts[pcts.length - 1]) {
      let index = 0;
      pcts.forEach((p, i) => {
        if (Math.abs(p - pct) < Math.abs(pcts[index] - pct)) index = i;
      });
      maoColumn = { index, pct, price: maxOfferPrice };
    }
  }

  return {
    rows: rates.map((ratePct) => ({ ratePct })),
    columns,
    cells,
    current: { row: currentIndex, column: 2 },
    columnVariable,
    maoColumn,
  };
}
