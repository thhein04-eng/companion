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
  | 'capex';

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
