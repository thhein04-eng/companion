import type {
  ComparisonRow,
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
}

/** A comparison row with the Deal Analyzer's columns added (`withDealMetrics`). */
export type DealComparisonRow = ComparisonRow & {
  monthlyCashFlow: number | null;
  annualNoi: number | null;
  capRate: number | null;
  cashOnCashReturn: number | null;
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
