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
    | `rental.${keyof RentalAssumptions}`;
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
    monthlyCashFlow: number | null;
    annualNoi: number | null;
    capRate: number | null;
    cashOnCashReturn: number | null;
  }[];
}

/** The shape persisted to (and read back from) `sessionStorage`. */
export interface PersistedState {
  scenarios: LoanScenario[];
  activeScenarioId: string;
}

/** A cents-rounded figure expressed both per month and per year. */
export type MonthlyAnnual = { monthly: number; annual: number };

export type OperatingExpenseCategory =
  | 'propertyTax'
  | 'insurance'
  | 'hoa'
  | 'vacancy'
  | 'management'
  | 'maintenance'
  | 'capex'
  /** A user-defined expense; the suffix (its id, or list index) keeps lines unique. */
  | `custom-${string}`;

export type OperatingExpenseLine = {
  category: OperatingExpenseCategory;
  label: string;
} & MonthlyAnnual;

export interface CustomExpenseItem {
  id?: string;
  label: string; // e.g., "Utilities (Water/Trash)", "Landscaping"
  monthlyAmount: number;
}

/** An unrounded ratio (fraction, e.g. `0.0376`), or `null` with a human-readable reason when not applicable. */
export type RatioResult = { value: number | null; naReason: string | null };

export type OnePercentRuleResult = {
  pass: boolean;
  targetRent: number;
  actualRent: number;
};

export type FiftyPercentRuleResult = {
  opexRatio: number;
  withinRule: boolean;
  estimatedMonthlyCashFlow: number;
};

/** The derived (never stored) investment analysis of one rental scenario. */
export interface DealAnalysis {
  grossScheduledIncome: MonthlyAnnual;
  operatingExpenses: OperatingExpenseLine[];
  totalOperatingExpenses: MonthlyAnnual;
  netOperatingIncome: MonthlyAnnual;
  debtService: MonthlyAnnual;
  cashFlow: MonthlyAnnual;
  totalCashInvested: number;
  cashOnCashReturn: RatioResult;
  capRate: RatioResult;
  onePercentRule: OnePercentRuleResult | null;
  fiftyPercentRule: FiftyPercentRuleResult | null;
  pmiEndsInYearOne: boolean;
  pmiDropPeriod: number | null;
}
