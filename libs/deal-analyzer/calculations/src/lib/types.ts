import type {
  ArmTerms,
  ComparisonRow,
  FieldError,
  FinancingOptionId,
  LoanTerms,
  MonthlyAnnual,
  OccupancyView,
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
  /** The income view analyzed, or null without an owner-occupied unit (spec 012). */
  view: OccupancyView | null;
  /** Rent, other income and RUBS reimbursements in this view (spec 012 FR-019). */
  income: {
    rent: MonthlyAnnual;
    other: MonthlyAnnual;
    reimbursements: MonthlyAnnual;
  };
  /** One row per unit when the rent roll has 2 or more units (spec 012 FR-010); else []. */
  unitBreakdown: {
    id: string;
    name: string;
    rent: number;
    vacancy: number;
    ratePct: number;
  }[];
  /** −cash flow in the "Living there" view of a house-hacked deal; else null (FR-014). */
  netHousingCost: MonthlyAnnual | null;
}

/** One projected year of the wealth simulator (spec 008 data-model §B). Money is cents-rounded. */
export interface WealthYear {
  /** 0…N (0 = purchase). */
  year: number;
  /** (price + forced) × (1 + appreciation)^year. */
  propertyValue: number;
  /** 0 after payoff or past the loan term. */
  loanBalance: number;
  /** propertyValue − loanBalance. */
  equity: number;
  /** price − loan. */
  initialEquity: number;
  /** The one-time forced appreciation. */
  forcedAppreciation: number;
  /** propertyValue − price − forced. */
  marketAppreciation: number;
  /** loan − loanBalance. */
  principalPaid: number;
  /** 0 in year 0. */
  noi: number;
  /** 0 in year 0; spec 005 definition (never extra principal). */
  cashFlow: number;
  cumulativeCashFlow: number;
  /** Scheduled interest paid in the year. */
  interest: number;
  /** basis / 27.5, capped by the remaining basis. */
  depreciation: number;
  /** noi − interest − depreciation; null when the tax inputs are invalid. */
  taxableIncome: number | null;
  /** −taxableIncome × rate (positive = tax saved). */
  taxEffect: number | null;
  cumulativeTaxEffect: number | null;
  /** equity + cumulativeCashFlow. */
  netWorth: number;
  netWorthAfterTax: number | null;
}

/** The derived (never stored) wealth projection of a rental scenario (spec 008). */
export interface WealthProjection {
  /** The owner's move-out year for the chart/table marker, or null (spec 012 FR-016). */
  moveOutYear: number | null;
  /** Year 0…N, or null with naReason (no price, or an invalid horizon/forced input). */
  years: WealthYear[] | null;
  naReason: string | null;
  horizonYears: number;
  depreciableBasis: number | null;
  totalCashInvested: number;
  /** netWorth(N) / totalCashInvested, or null with a reason. */
  multiple: RatioResult;
  /** Set when the tax inputs are invalid; the tax fields are then null. */
  taxNaReason: string | null;
  errors: FieldError[];
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

/** One operating year of the hold & exit pro forma (spec 009 data-model §B). */
export interface ProFormaYear {
  /** 1…N */
  year: number;
  grossIncome: number;
  operatingExpenses: number;
  noi: number;
  /** Scheduled P&I + PMI; 0 past the term. */
  debtService: number;
  /** Σ extraPrincipalApplied in the year. */
  extraPrincipal: number;
  /** noi − debtService − extraPrincipal (R2). */
  cashToInvestor: number;
  /** = projectWealth */
  interest: number;
  /** = projectWealth */
  depreciation: number;
  /** = projectWealth */
  taxableIncome: number | null;
  /** = projectWealth */
  taxEffect: number | null;
  /** cashToInvestor + taxEffect */
  afterTaxCashFlow: number | null;
  loanBalance: number;
  propertyValue: number;
}

/** Totals and returns for one cash-flow series (pre- or after-tax; R4, R5). */
export interface ExitReturns {
  /** Σ cash flows (pre- or after-tax). */
  totalCashFlow: number;
  /** totalCashFlow + netSaleProceeds − invested */
  totalNetProfit: number;
  /** (totalCashFlow + netSaleProceeds) / invested */
  equityMultiple: RatioResult;
  /** Fraction, e.g. 0.156607. */
  irr: RatioResult;
}

/** The sale at the end of year N and the returns from buying, holding and selling. */
export interface ExitResult {
  holdYears: number;
  years: ProFormaYear[];
  salePrice: number;
  sellingCosts: number;
  loanPayoff: number;
  netSaleProceeds: number;
  totalCashInvested: number;
  /** > 0 shows the "includes forced appreciation" note. */
  forcedAppreciation: number;
  preTax: ExitReturns;
  /** Null when the tax inputs are invalid. */
  afterTax: ExitReturns | null;
  taxNaReason: string | null;
}

export interface ExitProjection {
  /** The owner's move-out year for the pro forma marker, or null (spec 012 FR-016). */
  moveOutYear: number | null;
  /** Null with naReason when no price, or exit/horizon inputs invalid. */
  result: ExitResult | null;
  naReason: string | null;
  errors: FieldError[];
}

/** Sale assumptions after defaults, sharing and clamping (spec 013 data-model §B). */
export interface ResolvedSaleAssumptions {
  /** `scenario.rental != null`. */
  mode: 'rental' | 'non-rental';
  /** Clamped to 1…termMonths. */
  exitMonth: number;
  /** The stored value when clamping changed it, else null. */
  clampedFrom: number | null;
  exitUnit: 'years' | 'months';
  /** `rental.appreciationPct` (rental) or `sale.appreciationPct` (non-rental). */
  appreciationPct: number;
  /** `rental.exit.sellingCostsPct` (rental) or `sale.sellingCostsPct` (non-rental). */
  sellingCostsPct: number;
  tax: {
    enabled: boolean;
    capitalGainsRatePct: number;
    recaptureRatePct: number;
    /** `rental.wealth.landValuePct`; null when non-rental. */
    landValuePct: number | null;
  };
}

/** The minimum sale price for $0 profit (spec 013 US2, research R7). */
export interface SaleBreakEven {
  /** ≥ 0, cents. */
  salePrice: number;
  /** The raw solution was < 0: any sale price is profitable. */
  anyPrice: boolean;
  /** Projected sale price − break-even price. */
  cushion: number;
  /** Break-even ÷ purchase price, unrounded. */
  pctOfPurchase: number;
}

/** Illustrative tax on the sale (spec 013 US3, research R8). */
export interface SaleTaxEstimate {
  /** Building share of price + rehab; null when non-rental. */
  depreciableBasis: number | null;
  /** 0 when non-rental. */
  depreciationTaken: number;
  adjustedBasis: number;
  /** May be negative (a loss). */
  taxableGain: number;
  recapturedGain: number;
  recaptureTax: number;
  capitalGain: number;
  capitalGainsTax: number;
  totalTax: number;
  afterTaxNetProfit: number;
  /** exitMonth ≤ 12. */
  shortTermWarning: boolean;
}

/** The sale at one exit month and whether it is a real profit (spec 013 data-model §C). */
export interface SaleResult {
  mode: 'rental' | 'non-rental';
  exitMonth: number;
  clampedFrom: number | null;
  salePrice: number;
  sellingCosts: number;
  remainingBalance: number;
  /** salePrice − sellingCosts − remainingBalance */
  netSaleProceeds: number;
  /** 0 when non-rental. */
  cumulativeCashFlow: number;
  totalCashInvested: number;
  /** netSaleProceeds + cumulativeCashFlow − totalCashInvested */
  totalNetProfit: number;
  /** totalNetProfit ÷ totalCashInvested, unrounded. */
  returnOnCash: RatioResult;
  verdict: 'profit' | 'loss' | 'break-even';
  breakEven: SaleBreakEven;
  /** `rental.wealth.forcedAppreciation > 0` (Hold & Exit's sale price differs). */
  forcedAppreciationNote: boolean;
  /** Null when the estimate is off, or on with invalid tax inputs. */
  tax: SaleTaxEstimate | null;
  taxNaReason: string | null;
}

export interface SaleAnalysis {
  /** Null with naReason when there is no price, or the sale inputs are invalid. */
  result: SaleResult | null;
  naReason: string | null;
  errors: FieldError[];
}

/** Refinance & BRRRR Modeling (spec 014): the stored inputs over the defaults, clamped. */
export interface ResolvedRefinanceAssumptions {
  mode: 'cash-out' | 'rate-drop';
  /** `null` = not entered. */
  arv: number | null;
  ltvPct: number;
  /** `null` = not entered. */
  newRatePct: number | null;
  /** The month refinanced, clamped to `1…termMonths`. */
  refinanceMonth: number;
  /** The stored month when it was above the term (drives the note), else `null`. */
  clampedFrom: number | null;
  /** `termMonths − refinanceMonth`; 0 at the final month. */
  remainingMonths: number;
  newTermMonths: number;
  termUnit: 'years' | 'months';
  /** Refinance closing costs. */
  closingCosts: number;
}

/** The cash-out proceeds (spec 014 US1). All money is cents-rounded. */
export interface CashOutProceeds {
  /** `roundCents(arv × ltvPct / 100)` */
  newLoan: number;
  /** The current loan's remaining balance at the refinance month. */
  payoff: number;
  closingCosts: number;
  /** `newLoan − payoff − closingCosts`. Negative = a cash-in refinance. */
  netProceeds: number;
  isCashIn: boolean;
  /** Cents-rounded monthly P&I of the current and new loans. */
  currentPi: number;
  newPi: number;
  /** `newPi − currentPi` */
  piChange: number;
}

/** The BRRRR scorecard (spec 014 US2): the cash left in the deal and the returns on it. */
export interface CashOutCapital {
  /** From `analyzeDeal` with a rental; the down payment alone without one. */
  totalCashInvested: number;
  /** `totalCashInvested − netProceeds` */
  cashLeft: number;
  /** `netProceeds / totalCashInvested`; N/A when nothing was invested. Negative for a cash-in refinance. */
  capitalRecycledPct: RatioResult;
  /** `cashLeft ≤ 0` */
  allCashRecovered: boolean;
  /** `−cashLeft` when all cash is recovered, else 0. */
  cashSurplus: number;
  /** Annual net operating income from `analyzeDeal`. `null` without a rental. */
  noiAnnual: number | null;
  cashFlowBefore: number | null;
  cashOnCashBefore: RatioResult;
  /** `noiAnnual − 12 × newPi` (no PMI on the new loan, no growth). `null` without a rental. */
  cashFlowAfter: number | null;
  /** `cashFlowAfter / cashLeft`; N/A without a rental or when all the cash is recovered. */
  cashOnCashAfter: RatioResult;
}

export type CashOutResult = CashOutProceeds & CashOutCapital;

export interface CashOutAnalysis {
  result: CashOutResult | null;
  naReason: string | null;
  errors: FieldError[];
}

/** How the rate-drop savings pay back the closing costs (spec 014 data-model §D). */
export type RateDropBreakeven =
  | { kind: 'immediate' }
  | {
      kind: 'month';
      months: number;
      years: number;
      remainderMonths: number;
      /** `refinanceMonth + months` */
      loanMonth: number;
    }
  | { kind: 'none'; reason: string }
  | { kind: 'beyond-term' };

export interface RateDropResult {
  /** The new loan's principal: the remaining balance at the refinance month. */
  balanceRefinanced: number;
  currentPi: number;
  newPi: number;
  /** `currentPi − newPi`; negative when the payment goes up. */
  monthlySavings: number;
  breakeven: RateDropBreakeven;
  /** Net savings over the remaining term (research R10). */
  netSavings: number;
  horizonMonths: number;
  newTermMonths: number;
  /** The new term is longer than the months remaining. */
  termExtended: boolean;
}

export interface RateDropAnalysis {
  result: RateDropResult | null;
  naReason: string | null;
  errors: FieldError[];
}
