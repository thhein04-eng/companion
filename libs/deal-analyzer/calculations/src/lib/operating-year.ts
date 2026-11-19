import type { LoanScenario, RentalAssumptions } from 'shared-calculations';
import { growthRates } from './project-rental';
import { rentalLineItems } from './rental-line-items';

/**
 * Gross income and operating expenses for operating year `year` (1-based), with rent and
 * expense growth applied from year 2 on (spec 005 FR-013). Shared by `projectWealth` past the
 * loan term and by `projectExit` (spec 009 T006), so every page uses one growth rule.
 * Unrounded; callers round.
 */
export function operatingYear(
  scenario: LoanScenario,
  year: number,
): { gsiMonthly: number; opexMonthly: number } {
  const rental = scenario.rental as RentalAssumptions;
  const rates = growthRates(rental);
  const gsiMonthly =
    (rental.grossMonthlyRent + rental.otherMonthlyIncome) *
    (1 + rates.rent) ** (year - 1);
  const opexMonthly = rentalLineItems(
    scenario,
    gsiMonthly,
    (1 + rates.expense) ** (year - 1),
  ).reduce((sum, line) => sum + line.monthly, 0);
  return { gsiMonthly, opexMonthly };
}
