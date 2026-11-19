import { DEFAULT_RENTAL_ASSUMPTIONS } from './rental-defaults';
import type { DownPayment, LoanScenario, RentalAssumptions } from './types';

/** The single-number rental inputs the deal UI edits (spec 010 data-model §A). */
export type RentalDealField =
  | 'grossMonthlyRent'
  | 'otherMonthlyIncome'
  | 'vacancyPct'
  | 'managementPct'
  | 'maintenanceReservePct'
  | 'capexReservePct'
  | 'closingCosts'
  | 'rehabBudget';

/** Every shared input the strip, sheet, sentence, scrub and undo address by key. */
export type DealFieldKey =
  | 'homePrice'
  | 'downPayment'
  | 'principal'
  | 'annualInterestRatePct'
  | 'termMonths'
  | 'startDate'
  | 'annualPropertyTax'
  | 'annualInsurance'
  | 'pmiAnnualRatePct'
  | 'monthlyHoa'
  | `rental.${RentalDealField}`;

export const DEAL_FIELD_LABELS: Record<DealFieldKey, string> = {
  homePrice: 'Home price',
  downPayment: 'Down payment',
  principal: 'Loan amount',
  annualInterestRatePct: 'Rate',
  termMonths: 'Term',
  startDate: 'First payment date',
  annualPropertyTax: 'Property tax',
  annualInsurance: 'Insurance',
  pmiAnnualRatePct: 'PMI rate',
  monthlyHoa: 'HOA',
  'rental.grossMonthlyRent': 'Rent',
  'rental.otherMonthlyIncome': 'Other income',
  'rental.vacancyPct': 'Vacancy',
  'rental.managementPct': 'Management',
  'rental.maintenanceReservePct': 'Maintenance',
  'rental.capexReservePct': 'CapEx',
  'rental.closingCosts': 'Closing costs',
  'rental.rehabBudget': 'Rehab budget',
};

/**
 * Scrub / arrow-key step per field (data-model §A), kept fine so a value can be dialed in
 * precisely; Shift steps ×10. Term steps a year (12 months). A down payment steps 0.1 point as
 * a percent and $100 as an amount; `stepValue` picks.
 */
export const DEAL_FIELD_STEPS: Partial<Record<DealFieldKey, number>> = {
  homePrice: 100,
  principal: 100,
  annualInterestRatePct: 0.01,
  termMonths: 12,
  annualPropertyTax: 10,
  annualInsurance: 10,
  pmiAnnualRatePct: 0.01,
  monthlyHoa: 1,
  'rental.grossMonthlyRent': 1,
};

/** A down payment's step as a percent (points) and as an amount (dollars). */
export const DOWN_PAYMENT_STEPS = { percent: 0.1, amount: 100 } as const;

const rentalKey = (key: DealFieldKey): RentalDealField | null =>
  key.startsWith('rental.') ? (key.slice(7) as RentalDealField) : null;

/** The current value of a shared input: a number, a `DownPayment`, an ISO date, or `null`. */
export function readDealField(
  scenario: LoanScenario,
  key: DealFieldKey,
): number | DownPayment | string | null {
  const rk = rentalKey(key);
  if (rk) return scenario.rental?.[rk] ?? null;
  return (
    (
      scenario as unknown as Record<
        string,
        number | DownPayment | string | null
      >
    )[key] ?? null
  );
}

/**
 * The scenario patch that sets one shared input, matching what the existing editors produce.
 * The first rent entry seeds the editable rental defaults (spec 002 FR-002). Other rental
 * fields are ignored while there is no rental.
 */
export function dealFieldPatch(
  scenario: LoanScenario,
  key: DealFieldKey,
  value: unknown,
): Partial<LoanScenario> {
  const rk = rentalKey(key);
  if (!rk) return { [key]: value } as Partial<LoanScenario>;
  if (scenario.rental == null) {
    if (rk !== 'grossMonthlyRent' || value == null) return {};
    return {
      rental: {
        ...DEFAULT_RENTAL_ASSUMPTIONS,
        grossMonthlyRent: value as number,
      } as RentalAssumptions,
    };
  }
  return { rental: { ...scenario.rental, [rk]: value ?? 0 } };
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);
/** Shows a percent at full precision (up to 6 decimals, like the input fields), never cut to 3. */
const pct = (n: number) =>
  `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(n)}%`;

/** Short display text for a chip, sentence token or toast ("$450,000", "6.5%", "30 yr"). */
export function formatDealField(key: DealFieldKey, value: unknown): string {
  if (value == null) return '—';
  if (key === 'downPayment') {
    const dp = value as DownPayment;
    return 'percent' in dp ? pct(dp.percent) : money(dp.amount);
  }
  if (key === 'termMonths') {
    const m = value as number;
    return m % 12 === 0 ? `${m / 12} yr` : `${m} mo`;
  }
  if (key === 'startDate') return String(value);
  if (
    key === 'annualInterestRatePct' ||
    key === 'pmiAnnualRatePct' ||
    key.endsWith('Pct')
  ) {
    return pct(value as number);
  }
  return money(value as number);
}
