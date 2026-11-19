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
  /** Sale Profit & Exit Analyzer inputs (spec 013). Optional; missing = defaults. */
  sale?: SaleAssumptions | null;
}

/**
 * Sale Profit & Exit Analyzer assumptions (spec 013 data-model §A). Every field optional;
 * missing = default. Scenario-level (not under `rental`) so a non-rental can be analysed.
 */
export interface SaleAssumptions {
  /** Integer ≥ 1; > term is clamped, not an error. Default: valid stored hold × 12, else 84. */
  exitMonth?: number;
  /** Display unit for the exit input. Default 'years'. */
  exitUnit?: 'years' | 'months';
  /** −10 ≤ x ≤ 25; used only when no rental (otherwise `rental.appreciationPct`). Default 0. */
  appreciationPct?: number;
  /** 0 ≤ x ≤ 15. Default 7; used only when no rental (otherwise `rental.exit.sellingCostsPct`). */
  sellingCostsPct?: number;
  tax?: SaleTaxAssumptions | null;
}

/** Illustrative tax-on-sale estimate (spec 013 US3). Every field optional. */
export interface SaleTaxAssumptions {
  /** Default `false`. */
  enabled?: boolean;
  /** 0 ≤ x ≤ 40. Default 15. */
  capitalGainsRatePct?: number;
  /** 0 ≤ x ≤ 40. Default 25. */
  recaptureRatePct?: number;
}

/** Which income a house-hacked deal shows (spec 012 FR-012). */
export type OccupancyView = 'living' | 'afterMoveOut';

/**
 * One unit of a scenario's rent roll (spec 012 data-model §A). An owner-occupied unit earns $0
 * while the owner lives there and `rentAfterMoveOut` afterwards; its `rent` is not used.
 */
export interface RentUnit {
  id: string;
  /** 1–40 characters, trimmed. */
  name: string;
  /** Integer 0–10, or null when not given. */
  bedrooms: number | null;
  /** 0–10 in steps of 0.5, or null when not given. */
  bathrooms: number | null;
  /** Monthly rent, ≥ 0. */
  rent: number;
  /** 0–100; null = use the rental's overall `vacancyPct`. */
  vacancyPct: number | null;
  /** At most one unit in a rent roll may be owner-occupied. */
  ownerOccupied: boolean;
  /** ≥ 0; the owner-occupied unit's rent after move-out. Null reads as $0 with a missing hint. */
  rentAfterMoveOut: number | null;
}

/**
 * Rental-property assumptions for one scenario (Deal Analyzer).
 * Dollar fields (`grossMonthlyRent`, `otherMonthlyIncome`, `closingCosts`,
 * `rehabBudget`) must be ≥ 0. Percentage fields (`vacancyPct`, `managementPct`,
 * `maintenanceReservePct`, `capexReservePct`) must satisfy 0 ≤ x ≤ 100 and are
 * percentages of Gross Scheduled Income.
 */
export interface RentalAssumptions {
  /**
   * Total monthly rent. With a rent roll (`units`), this is always the after-move-out rent-roll
   * total, kept in sync by every rent-roll write (spec 012 research R1).
   */
  grossMonthlyRent: number;
  /** The rent roll, 1–4 units (spec 012). Missing = one implicit unit at `grossMonthlyRent`. */
  units?: RentUnit[];
  /** Whole years from purchase until the owner moves out, 1–30. Missing = 1 (spec 012 FR-011). */
  moveOutYears?: number;
  /** The income view shown for a house-hacked deal. Missing = 'living' (spec 012 FR-013). */
  occupancyView?: OccupancyView;
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
  /** Hold & exit assumptions (spec 009). Optional; missing = defaults. */
  exit?: ExitAssumptions | null;
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

/** Hold & exit assumptions (spec 009). Every field optional; missing = default (FR-015). */
export interface ExitAssumptions {
  /** Integer 1…30. Default 7. */
  holdYears?: number;
  /** % of the sale price, 0 ≤ x ≤ 15. Default 7. */
  sellingCostsPct?: number;
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
    | `rental.customExpenses.${number}.recoveryPct`
    | `rental.units.${number}.${'name' | 'rent' | 'vacancyPct' | 'rentAfterMoveOut'}`
    | `rental.dscrMinimum`
    | `rental.financing.${FinancingOptionId}.${string}`
    | `rental.wealth.${keyof WealthAssumptions}`
    | `rental.exit.${keyof ExitAssumptions}`
    | `sale.${'exitMonth' | 'appreciationPct' | 'sellingCostsPct'}`
    | `sale.tax.${'capitalGainsRatePct' | 'recaptureRatePct'}`;
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
  /** Who pays (spec 012 FR-017). Missing = 'landlord'. 'rubs' = tenants reimburse a share. */
  paidBy?: 'landlord' | 'rubs';
  /** Share of a RUBS expense recovered from tenants, 0–100. Missing = 100. */
  recoveryPct?: number;
}

/** An unrounded ratio (fraction, e.g. `0.0376`), or `null` with a human-readable reason when not applicable. */
export type RatioResult = { value: number | null; naReason: string | null };
