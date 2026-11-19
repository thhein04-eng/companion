import type { RentalAssumptions } from './types';

/** Common investor screening defaults, seeded as editable values on first rent entry (spec 002 FR-002, research R3; moved to shared-calculations in spec 010 R6). */
export const DEFAULT_RENTAL_ASSUMPTIONS: Omit<
  RentalAssumptions,
  'grossMonthlyRent'
> = {
  otherMonthlyIncome: 0,
  vacancyPct: 5,
  managementPct: 8,
  maintenanceReservePct: 5,
  capexReservePct: 5,
  closingCosts: 0,
  rehabBudget: 0,
  customExpenses: [],
  rentGrowthPct: 0,
  expenseGrowthPct: 0,
  appreciationPct: 0,
};
