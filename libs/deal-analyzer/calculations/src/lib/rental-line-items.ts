import type {
  IncomeBasis,
  LoanScenario,
  RentalAssumptions,
} from 'shared-calculations';
import type { OperatingExpenseCategory } from './types';

/**
 * Internal (not re-exported from `index.ts`): the Deal Analyzer's operating-expense lines, shared
 * by `analyzeDeal` (year 1) and `projectRental` (every year) so the definitions live in one place
 * (spec 005 FR-012).
 *
 * - Fixed lines (property tax, insurance, HOA and custom expenses) are scaled by `expenseFactor`
 *   (1 in year 1; `(1 + expenseGrowth)^(N−1)` in year N).
 * - Management, maintenance and CapEx are percentages of rent + other income, so they follow
 *   income (rent growth). Vacancy comes from the rent roll (spec 012 FR-009): each unit's rent ×
 *   its own rate, other income × the overall rate.
 * - `income` is either the rent roll's `IncomeBasis` (already grown) or, as before spec 012, a
 *   bare monthly gross income with vacancy at the overall rate (`dscr.ts` passes 1 to read each
 *   percentage line's share).
 *
 * Monthly amounts are unrounded; callers round per the data-model rounding rules.
 */
export function rentalLineItems(
  scenario: LoanScenario,
  income: IncomeBasis | number,
  expenseFactor: number,
): { category: OperatingExpenseCategory; label: string; monthly: number }[] {
  const rental = scenario.rental as RentalAssumptions;
  const gsiMonthly =
    typeof income === 'number' ? income : income.pctBaseMonthly;
  const pctOfGsi = (pct: number) => (gsiMonthly * pct) / 100;
  const vacancyMonthly =
    typeof income === 'number'
      ? pctOfGsi(rental.vacancyPct)
      : income.vacancyMonthly;
  const unitRates = typeof income !== 'number' && income.hasUnitRates;
  const lines: {
    category: OperatingExpenseCategory;
    label: string;
    monthly: number;
  }[] = [
    {
      category: 'propertyTax',
      label: 'Property tax',
      monthly: ((scenario.annualPropertyTax ?? 0) / 12) * expenseFactor,
    },
    {
      category: 'insurance',
      label: 'Insurance',
      monthly: ((scenario.annualInsurance ?? 0) / 12) * expenseFactor,
    },
    {
      category: 'hoa',
      label: 'HOA fees',
      monthly: (scenario.monthlyHoa ?? 0) * expenseFactor,
    },
    {
      category: 'vacancy',
      label: unitRates ? 'Vacancy' : `Vacancy (${rental.vacancyPct}%)`,
      monthly: vacancyMonthly,
    },
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

  // User-defined custom expenses (utilities, trash, landscaping, …) are fixed costs at their full
  // amount, RUBS or not; the tenants' share comes back as income (spec 012 FR-019).
  (rental.customExpenses ?? []).forEach((custom, index) => {
    lines.push({
      category: `custom-${custom.id ?? index}`,
      label: custom.label,
      monthly: custom.monthlyAmount * expenseFactor,
    });
  });

  return lines;
}
