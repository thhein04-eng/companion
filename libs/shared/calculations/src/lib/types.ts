/** A down payment expressed either as a flat amount or as a percentage of `homePrice`. */
export type DownPayment = { amount: number } | { percent: number };

/**
 * A named, independently-editable set of loan inputs. `principal > 0`,
 * `termMonths > 0`, `annualInterestRatePct >= 0` (0% is valid, see Edge Cases).
 * When `downPayment` is a percent it must satisfy `0 <= percent < 100`; when
 * an amount, `0 <= amount < homePrice`.
 */
export interface LoanScenario {
  id: string;
  name: string;
  principal: number;
  annualInterestRatePct: number;
  termMonths: number;
  startDate: string;
  paymentFrequency: 'monthly';
  homePrice: number | null;
  downPayment: DownPayment | null;
  annualPropertyTax: number | null;
  annualInsurance: number | null;
  pmiAnnualRatePct: number | null;
  monthlyHoa: number | null;
  extraPayments: ExtraPaymentRule[];
  /** `true` once the user has typed `principal` directly; `false` while it reflects
   * the home-price-minus-down-payment auto-calculation (FR-014). */
  principalIsOverridden: boolean;
  /** Rental/investment inputs for the Deal Analyzer. `null`/absent = not analyzing as a rental. */
  rental?: RentalAssumptions | null;
}

/**
 * Rental-property assumptions for one scenario (Deal Analyzer).
 * Dollar fields (`grossMonthlyRent`, `otherMonthlyIncome`, `closingCosts`,
 * `rehabBudget`) must be ≥ 0. Percentage fields (`vacancyPct`, `managementPct`,
 * `maintenanceReservePct`, `capexReservePct`) must satisfy 0 ≤ x ≤ 100 and are
 * percentages of Gross Scheduled Income.
 */
export interface RentalAssumptions {
  grossMonthlyRent: number;
  otherMonthlyIncome: number;
  vacancyPct: number;
  managementPct: number;
  maintenanceReservePct: number;
  capexReservePct: number;
  closingCosts: number;
  rehabBudget: number;
  customExpenses?: CustomExpenseItem[];
  /**
   * Annual growth of gross rent + other income, %. Optional; missing = 0. −10 ≤ x ≤ 25.
   * Percentage-of-income expense lines (vacancy, management, …) grow with it.
   */
  rentGrowthPct?: number;
  /**
   * Annual growth of the fixed operating expenses (property tax, insurance, HOA and custom
   * expenses), %. Optional; missing = 0. −10 ≤ x ≤ 25.
   */
  expenseGrowthPct?: number;
  /** Annual appreciation of the purchase price, %. Optional; missing = 0. −10 ≤ x ≤ 25. */
  appreciationPct?: number;
  /** Minimum DSCR to test against (spec 006 FR-002). Optional; missing = 1.25. 1.00 ≤ x ≤ 2.00. */
  dscrMinimum?: number;
  /** Stored financing-matrix terms (spec 006 FR-012). Optional; missing = derive from the scenario. */
  financing?: FinancingTerms | null;
  /** Structure in focus in the matrix toggle (spec 006 FR-010). Optional; missing = 'conventional'. */
  financingSelection?: FinancingOptionId;
  /** Wealth-projection assumptions (spec 008). Optional; missing = defaults. */
  wealth?: WealthAssumptions | null;
}

/** Wealth-projection assumptions (spec 008). Every field optional; missing = default (FR-015). */
export interface WealthAssumptions {
  /** Integer 1…30. Default 10. */
  horizonYears?: number;
  /** One-time value uplift at purchase, $ ≥ 0. Default 0. */
  forcedAppreciation?: number;
  /** Land share of the price, 0 ≤ x < 100. Default 20. */
  landValuePct?: number;
  /** 0 ≤ x ≤ 60. Default 24. */
  marginalTaxRatePct?: number;
}

/** The three loan structures compared by the financing matrix (spec 006). */
export type FinancingOptionId = 'conventional' | 'arm' | 'dscr';

/** Terms shared by every financing structure. */
export interface LoanTerms {
  /** 0 ≤ x < 100, % of purchase price. */
  downPaymentPct: number;
  /** 0 ≤ x ≤ 25 (initial rate for the ARM). */
  annualRatePct: number;
  /** Integer 1…40. */
  termYears: number;
}

/** An adjustable-rate mortgage: fixed for `fixedPeriodYears`, then `adjustedRatePct`. */
export interface ArmTerms extends LoanTerms {
  /** Must be < termYears. */
  fixedPeriodYears: 3 | 5 | 7 | 10;
  /** 0 ≤ x ≤ 25, applies for the rest of the term. */
  adjustedRatePct: number;
}

/** Investor-owned matrix terms; present only after the first matrix edit (spec 006 research R7). */
export interface FinancingTerms {
  conventional: LoanTerms;
  arm: ArmTerms;
  dscr: LoanTerms;
}

/** A user-defined extra-principal-payment instruction applied when generating a schedule. */
export type ExtraPaymentRule =
  | { id: string; kind: 'recurring'; amount: number; startPeriod: number }
  | { id: string; kind: 'oneTime'; amount: number; date: string };

/** One row of a generated `AmortizationSchedule`. */
export interface SchedulePeriod {
  periodNumber: number;
  date: string;
  paymentAmount: number;
  principalPortion: number;
  interestPortion: number;
  extraPrincipalApplied: number;
  remainingBalance: number;
  pmiApplies: boolean;
}

/** The full computed result of a `LoanScenario`, always derived, never persisted on its own. */
export interface AmortizationSchedule {
  scenarioId: string;
  periods: SchedulePeriod[];
  summary: {
    totalInterestPaid: number;
    totalPaid: number;
    payoffDate: string;
    pmiDropPeriod: number | null;
    monthlyPrincipalAndInterest: number;
    totalMonthlyPayment: number;
    /** Monthly PMI amount while PMI applies, cents-rounded; `0` when there is no PMI. */
    monthlyPmiAmount: number;
  };
  baselineComparison: { periodsSaved: number; interestSaved: number } | null;
}

/** A single field-level validation failure, keyed to the offending `LoanScenario` field. */
export interface FieldError {
  field:
    | keyof LoanScenario
    | `extraPayments.${number}.${string}`
    | `rental.${keyof RentalAssumptions}`
    | `rental.customExpenses.${number}.monthlyAmount`
    | `rental.dscrMinimum`
    | `rental.financing.${FinancingOptionId}.${string}`
    | `rental.wealth.${keyof WealthAssumptions}`;
  message: string;
}

/** The side-by-side reduction of two or more computed schedules, for User Story 4. */
export interface ScenarioComparison {
  scenarioIds: string[];
  rows: {
    scenarioId: string;
    monthlyPayment: number;
    totalInterest: number;
    totalCost: number;
    payoffDate: string;
  }[];
}

/** One loan-column row of a `ScenarioComparison`; feature libs extend it with their own columns. */
export type ComparisonRow = ScenarioComparison['rows'][number];

/** The shape persisted to (and read back from) `sessionStorage`. */
export interface PersistedState {
  scenarios: LoanScenario[];
  activeScenarioId: string;
}

/** A cents-rounded figure expressed both per month and per year. */
export type MonthlyAnnual = { monthly: number; annual: number };

/** A user-defined operating expense on a rental (part of the persisted `RentalAssumptions` shape). */
export interface CustomExpenseItem {
  id?: string;
  label: string; // e.g., "Utilities (Water/Trash)", "Landscaping"
  monthlyAmount: number;
}

/** An unrounded ratio (fraction, e.g. `0.0376`), or `null` with a human-readable reason when not applicable. */
export type RatioResult = { value: number | null; naReason: string | null };
