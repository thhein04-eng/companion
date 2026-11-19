import {
  hasOwnerUnit,
  rentRollIncome,
  type LoanScenario,
  type OccupancyView,
  type RentalAssumptions,
} from 'shared-calculations';
import { rentalLineItems } from './rental-line-items';

/** The three growth rates as fractions, treating a missing (pre-feature) value as 0% (FR-013). */
export function growthRates(rental: RentalAssumptions): {
  rent: number;
  expense: number;
  appreciation: number;
} {
  return {
    rent: (rental.rentGrowthPct ?? 0) / 100,
    expense: (rental.expenseGrowthPct ?? 0) / 100,
    appreciation: (rental.appreciationPct ?? 0) / 100,
  };
}

/**
 * The year the owner moves out of a house-hacked deal, or null without an owner unit
 * (spec 012 FR-016). Years 1…moveOutYear use the "Living there" income.
 */
export function moveOutYear(rental: RentalAssumptions): number | null {
  return hasOwnerUnit(rental) ? (rental.moveOutYears ?? 1) : null;
}

/** The income view of operating year `year` (spec 012 research R5). */
export function viewForYear(
  rental: RentalAssumptions,
  year: number,
): OccupancyView {
  const moveOut = moveOutYear(rental);
  return moveOut != null && year <= moveOut ? 'living' : 'afterMoveOut';
}

/**
 * Gross income, utility reimbursements and operating expenses for operating year `year`
 * (1-based), with rent and expense growth applied from year 2 on (spec 005 FR-013). Shared by
 * `projectRental`, `projectWealth` past the loan term, `projectExit` (spec 009 T006) and the sale
 * analysis (spec 013), so every page uses one growth rule. A house-hacked deal uses the "Living
 * there" income until the move-out year (spec 012 FR-016). Unrounded; callers round.
 *
 * NOI = gsiMonthly + reimbursementMonthly − opexMonthly.
 */
export function operatingYear(
  scenario: LoanScenario,
  year: number,
): { gsiMonthly: number; reimbursementMonthly: number; opexMonthly: number } {
  const rental = scenario.rental as RentalAssumptions;
  const rates = growthRates(rental);
  const expenseFactor = (1 + rates.expense) ** (year - 1);
  const income = rentRollIncome(rental, viewForYear(rental, year), {
    rent: (1 + rates.rent) ** (year - 1),
    expense: expenseFactor,
  });
  const opexMonthly = rentalLineItems(scenario, income, expenseFactor).reduce(
    (sum, line) => sum + line.monthly,
    0,
  );
  return {
    gsiMonthly: income.pctBaseMonthly,
    reimbursementMonthly: income.reimbursementMonthly,
    opexMonthly,
  };
}
