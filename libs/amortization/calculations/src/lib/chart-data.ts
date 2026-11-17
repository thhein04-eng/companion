import {
  computeSchedule,
  roundCents,
  type AmortizationSchedule,
  type LoanScenario,
} from 'shared-calculations';

/**
 * Pure dataset builders for the amortization charts (data-model.md §B). They return plain,
 * domain-free rows (`{ x, …series }`) that are structurally compatible with
 * `@companion/charts`'s `Datum`, without importing it.
 */

/** Balance before any payment: the first period's ending balance plus its principal. */
function startingBalance(schedule: AmortizationSchedule): number {
  const first = schedule.periods[0];
  return first
    ? roundCents(first.remainingBalance + first.principalPortion)
    : 0;
}

/** Balance at period `n` (0 = start), or `null` after payoff. */
function balanceAt(schedule: AmortizationSchedule, n: number): number | null {
  if (n === 0) return startingBalance(schedule);
  const period = schedule.periods[n - 1];
  return period ? period.remainingBalance : null;
}

export interface BalanceSeriesDatum {
  /** Period number; 0 is the starting balance. */
  x: number;
  /** ISO date: the first payment date for period 0, otherwise that period's date. */
  date: string;
  balance: number | null;
  baseline: number | null;
}

/**
 * Remaining balance per period (US1, FR-001), plus the no-extra-payment `baseline` when given.
 * Rows run from period 0 to the longer of the two schedules; a series is `null` after its payoff.
 */
export function buildBalanceSeries(
  schedule: AmortizationSchedule,
  baseline: AmortizationSchedule | null,
): BalanceSeriesDatum[] {
  const length = Math.max(
    schedule.periods.length,
    baseline?.periods.length ?? 0,
  );
  const dateSource =
    baseline && baseline.periods.length > schedule.periods.length
      ? baseline
      : schedule;
  const rows: BalanceSeriesDatum[] = [];
  for (let n = 0; n <= length; n++) {
    rows.push({
      x: n,
      date: dateSource.periods[Math.max(0, n - 1)]?.date ?? '',
      balance: balanceAt(schedule, n),
      baseline: baseline ? balanceAt(baseline, n) : null,
    });
  }
  return rows;
}

/**
 * The schedule without extra payments, for the balance chart's baseline. Returns `null` when the
 * scenario has no extra payments, so callers don't compute a duplicate schedule.
 */
export function computeBaselineSchedule(
  scenario: LoanScenario,
): AmortizationSchedule | null {
  if (scenario.extraPayments.length === 0) return null;
  return computeSchedule({ ...scenario, extraPayments: [] });
}

export interface YearlyPrincipalInterestDatum {
  /** `"Yr 1"` (loan year) or `"2027"` (calendar year). */
  x: string;
  /** Loan year number (1-based) or calendar year. */
  year: number;
  /** Scheduled principal: Σ(principalPortion − extraPrincipalApplied). */
  principal: number;
  extraPrincipal: number;
  interest: number;
  /** Σ paymentAmount. */
  total: number;
}

/**
 * Principal, extra principal and interest per year (US2, FR-002). `loanYear` groups periods
 * 1–12, 13–24, …; a partial final year is its own group. `calendarYear` groups by payment date.
 */
export function buildYearlyPrincipalInterest(
  schedule: AmortizationSchedule,
  { groupBy = 'loanYear' }: { groupBy?: 'loanYear' | 'calendarYear' } = {},
): YearlyPrincipalInterestDatum[] {
  const groups = new Map<
    number,
    { principal: number; extra: number; interest: number; total: number }
  >();
  for (const p of schedule.periods) {
    const year =
      groupBy === 'loanYear'
        ? Math.ceil(p.periodNumber / 12)
        : Number(p.date.slice(0, 4));
    const g = groups.get(year) ?? {
      principal: 0,
      extra: 0,
      interest: 0,
      total: 0,
    };
    g.principal += p.principalPortion - p.extraPrincipalApplied;
    g.extra += p.extraPrincipalApplied;
    g.interest += p.interestPortion;
    g.total += p.paymentAmount;
    groups.set(year, g);
  }
  return [...groups.entries()].map(([year, g]) => ({
    x: groupBy === 'loanYear' ? `Yr ${year}` : String(year),
    year,
    principal: roundCents(g.principal),
    extraPrincipal: roundCents(g.extra),
    interest: roundCents(g.interest),
    total: roundCents(g.total),
  }));
}

export interface PaymentComponent {
  key: 'principalAndInterest' | 'propertyTax' | 'insurance' | 'pmi' | 'hoa';
  label: string;
  value: number;
}

/**
 * What one monthly payment is made of (US3, FR-003). Components with value 0 are omitted.
 * `total` is the schedule's authoritative `totalMonthlyPayment`; the components (rounded one by
 * one) add up to it within $0.01.
 */
export function buildPaymentComposition(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
): { components: PaymentComponent[]; total: number } {
  const pmiApplies = schedule.periods[0]?.pmiApplies ?? false;
  const all: PaymentComponent[] = [
    {
      key: 'principalAndInterest',
      label: 'Principal & interest',
      value: schedule.summary.monthlyPrincipalAndInterest,
    },
    {
      key: 'propertyTax',
      label: 'Property tax',
      value: roundCents((scenario.annualPropertyTax ?? 0) / 12),
    },
    {
      key: 'insurance',
      label: 'Insurance',
      value: roundCents((scenario.annualInsurance ?? 0) / 12),
    },
    {
      key: 'pmi',
      label: 'PMI',
      value: pmiApplies ? schedule.summary.monthlyPmiAmount : 0,
    },
    { key: 'hoa', label: 'HOA', value: roundCents(scenario.monthlyHoa ?? 0) },
  ];
  return {
    components: all.filter((c) => c.value !== 0),
    total: schedule.summary.totalMonthlyPayment,
  };
}

/** One elapsed period across several scenarios, keyed by `scenarioId`. */
export type ScenarioBalanceDatum = { x: number } & Record<
  string,
  number | null
>;

/**
 * Remaining balance per elapsed period for several scenarios (US4, FR-004). The x-axis is the
 * period number, not the calendar date, so loans with different start dates line up by elapsed
 * time. Each column follows `buildBalanceSeries`'s rules: starting principal at 0, `null` after payoff.
 */
export function buildScenarioBalanceComparison(
  schedules: AmortizationSchedule[],
): ScenarioBalanceDatum[] {
  const length = Math.max(0, ...schedules.map((s) => s.periods.length));
  const rows: ScenarioBalanceDatum[] = [];
  for (let n = 0; n <= length; n++) {
    const row: ScenarioBalanceDatum = { x: n };
    for (const schedule of schedules)
      row[schedule.scenarioId] = balanceAt(schedule, n);
    rows.push(row);
  }
  return rows;
}
