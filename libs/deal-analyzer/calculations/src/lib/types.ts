import type {
  ArmTerms,
  ComparisonRow,
  FieldError,
  FinancingOptionId,
  LoanTerms,
  MonthlyAnnual,
  RatioResult,
} from 'shared-calculations';

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
  /** Coverage of the scenario's own loan (spec 006 US1). */
  dscr: DscrResult;
}

/** One payment phase of a financing structure (the ARM has two, the others one). Spec 006 data-model §C. */
export interface FinancingPhase {
  /** "Years 1–30", "Initial (years 1–7)", "After reset (years 8–30)". */
  label: string;
  fromYear: number;
  toYear: number;
  annualRatePct: number;
  monthlyPrincipalAndInterest: number;
  /** 0 for the DSCR loan, and when LTV ≤ 80% or the scenario has no PMI rate. */
  monthlyPmi: number;
  /** NOI monthly − P&I − PMI. */
  monthlyCashFlow: number;
  /** Annual cash flow ÷ cash invested. */
  cashOnCashReturn: RatioResult;
  dscr: DscrResult;
}

/** The derived figures for one structure: a matrix column. */
export interface FinancingOptionResult {
  id: FinancingOptionId;
  name: 'Conventional' | 'ARM' | 'DSCR loan';
  /** e.g. "30-yr fixed", "7/1 ARM", "30-yr DSCR". */
  description: string;
  terms: LoanTerms | ArmTerms;
  loanAmount: number;
  downPayment: number;
  ltv: number;
  /** Down payment + closing costs + rehab. */
  totalCashInvested: number;
  /** Null when the option's terms are invalid (the column shows "—"). */
  phases: FinancingPhase[] | null;
  errors: FieldError[];
}

/** The financing matrix of one scenario (spec 006 User Story 2). */
export interface FinancingMatrix {
  /** Null with `naReason` when there is no purchase price (FR-014). */
  options: FinancingOptionResult[] | null;
  naReason: string | null;
  selected: FinancingOptionId;
  /** True when the terms are stored (detached) rather than derived. */
  isCustomized: boolean;
  dscrMinimum: number | null;
}

/** The derived debt-service coverage of one loan (spec 006 data-model §B). */
export interface DscrResult {
  /** annualNoi / annualDebtService, unrounded. Null only when annualDebtService is 0. */
  value: number | null;
  naReason: string | null;
  /** The minimum tested against, or null when the stored minimum is invalid. */
  minimum: number | null;
  /** value ≥ minimum (unrounded), or null when either is null. */
  meetsMinimum: boolean | null;
  /** value ≥ 1, or null when value is null. */
  coversDebtService: boolean | null;
  /** Monthly P&I × 12, cents-rounded. */
  annualDebtService: number;
  /** Monthly gross rent for value = minimum (research R3), cents, ≥ 0; null with a reason when reserves ≥ 100%. */
  rentForMinimum: number | null;
  rentForMinimumNaReason: string | null;
}

/** A comparison row with the Deal Analyzer's columns added (`withDealMetrics`). */
export type DealComparisonRow = ComparisonRow & {
  monthlyCashFlow: number | null;
  annualNoi: number | null;
  capRate: number | null;
  cashOnCashReturn: number | null;
  dscr: number | null;
};

/** A `ScenarioComparison` whose rows carry deal metrics. */
export interface DealScenarioComparison {
  scenarioIds: string[];
  rows: DealComparisonRow[];
}

/** One loan year of a rental projection (spec 005 data-model.md §C). Money is cents-rounded. */
export interface RentalYear {
  /** 1…ceil(termMonths / 12). */
  year: number;
  /** `"Yr N"`, a category label for bar charts. */
  x: string;
  grossIncome: number;
  operatingExpenses: number;
  noi: number;
  /** Scheduled P&I plus PMI for the periods in this year (never extra principal); 0 after payoff. */
  debtService: number;
  cashFlow: number;
  /** cashFlow ÷ initial total cash invested (unrounded), or null when cash invested is 0. */
  cashOnCash: number | null;
  /** End-of-year value at the appreciation rate, or null without a purchase price. */
  homeValue: number | null;
  /** Remaining balance at the year's last period; 0 after payoff. */
  loanBalance: number;
  /** Purchase price − loan amount, or null without a purchase price. */
  initialEquity: number | null;
  /** Principal paid down (loan − balance, including extra principal) through this year. */
  principalPaid: number;
  /** homeValue − purchase price, or null without a purchase price. */
  appreciation: number | null;
}

/** The derived (never stored) year-by-year projection of a rental scenario. */
export interface RentalProjection {
  years: RentalYear[];
  totalCashInvested: number;
  /** `analyzeDeal`'s reason when cash-on-cash is undefined. */
  cashOnCashNaReason: string | null;
  /** Set when there is no purchase price, so equity cannot be computed. */
  equityNaReason: string | null;
}
