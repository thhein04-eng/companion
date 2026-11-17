import type { LoanScenario, OperatingExpenseCategory, RentalAssumptions } from './types';

/**
 * Internal (not re-exported from `index.ts`): the Deal Analyzer's operating-expense lines, shared
 * by `analyzeDeal` (year 1) and `projectRental` (every year) so the definitions live in one place
 * (FR-012).
 *
 * - Fixed lines (property tax, insurance, HOA) are scaled by `expenseFactor`
 *   (1 in year 1; `(1 + expenseGrowth)^(N−1)` in year N).
 * - Percentage lines (vacancy, management, maintenance, CapEx) are percentages of `gsiMonthly`,
 *   so they follow income (rent growth).
 *
 * Monthly amounts are unrounded; callers round per the data-model rounding rules.
 */
export function rentalLineItems(
  scenario: LoanScenario,
  gsiMonthly: number,
  expenseFactor: number
): { category: OperatingExpenseCategory; label: string; monthly: number }[] {
  const rental = scenario.rental as RentalAssumptions;
  const pctOfGsi = (pct: number) => (gsiMonthly * pct) / 100;
  return [
    { category: 'propertyTax', label: 'Property tax', monthly: ((scenario.annualPropertyTax ?? 0) / 12) * expenseFactor },
    { category: 'insurance', label: 'Insurance', monthly: ((scenario.annualInsurance ?? 0) / 12) * expenseFactor },
    { category: 'hoa', label: 'HOA fees', monthly: (scenario.monthlyHoa ?? 0) * expenseFactor },
    { category: 'vacancy', label: `Vacancy (${rental.vacancyPct}%)`, monthly: pctOfGsi(rental.vacancyPct) },
    {
      category: 'management',
      label: `Property management (${rental.managementPct}%)`,
      monthly: pctOfGsi(rental.managementPct),
    },
    {
      category: 'maintenance',
      label: `Maintenance reserve (${rental.maintenanceReservePct}%)`,
      monthly: pctOfGsi(rental.maintenanceReservePct),
    },
    {
      category: 'capex',
      label: `CapEx reserve (${rental.capexReservePct}%)`,
      monthly: pctOfGsi(rental.capexReservePct),
    },
  ];
}
