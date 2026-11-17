import type {
  AmortizationSchedule,
  ExtraPaymentRule,
  LoanScenario,
  SchedulePeriod,
} from './types';
import { roundCents } from './round';

const PMI_LTV_THRESHOLD = 0.8;

/** Adds `monthsToAdd` months to an ISO date, clamping the day to the target month's length. */
function addMonthsClamped(isoDate: string, monthsToAdd: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const totalMonthIndex0 = m - 1 + monthsToAdd;
  const targetYear = y + Math.floor(totalMonthIndex0 / 12);
  const targetMonthIndex0 = ((totalMonthIndex0 % 12) + 12) % 12;
  const daysInTargetMonth = new Date(
    targetYear,
    targetMonthIndex0 + 1,
    0,
  ).getDate();
  const targetDay = Math.min(d, daysInTargetMonth);
  const mm = String(targetMonthIndex0 + 1).padStart(2, '0');
  const dd = String(targetDay).padStart(2, '0');
  return `${targetYear}-${mm}-${dd}`;
}

function monthsBetween(fromIso: string, toIso: string): number {
  const [fy, fm] = fromIso.split('-').map(Number);
  const [ty, tm] = toIso.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/** Which 1-based period a one-time extra payment's calendar date falls into. */
function periodForDate(startDate: string, date: string): number {
  return Math.max(1, monthsBetween(startDate, date) + 1);
}

function extraForPeriod(
  rules: ExtraPaymentRule[],
  periodNumber: number,
  startDate: string,
): number {
  let total = 0;
  for (const rule of rules) {
    if (rule.kind === 'recurring' && periodNumber >= rule.startPeriod) {
      total += rule.amount;
    } else if (
      rule.kind === 'oneTime' &&
      periodForDate(startDate, rule.date) === periodNumber
    ) {
      total += rule.amount;
    }
  }
  return total;
}

/** The fixed periodic payment for a standard fully-amortizing fixed-rate loan. */
function fixedPayment(
  principal: number,
  monthlyRate: number,
  termMonths: number,
): number {
  if (monthlyRate === 0) {
    return principal / termMonths;
  }
  const factor = Math.pow(1 + monthlyRate, termMonths);
  return (principal * monthlyRate * factor) / (factor - 1);
}

/**
 * Produces a full `AmortizationSchedule` for a `LoanScenario`. Assumes
 * `scenario` has already passed `validateScenario` (FR-001–FR-008).
 */
export function computeSchedule(scenario: LoanScenario): AmortizationSchedule {
  const monthlyRate = scenario.annualInterestRatePct / 100 / 12;
  const payment = fixedPayment(
    scenario.principal,
    monthlyRate,
    scenario.termMonths,
  );

  const ltvBase = scenario.homePrice ?? scenario.principal;
  const pmiEligible =
    scenario.homePrice != null && scenario.pmiAnnualRatePct != null;
  const monthlyPmiAmount = pmiEligible
    ? (((scenario.pmiAnnualRatePct as number) / 100) * scenario.principal) / 12
    : 0;

  const periods: SchedulePeriod[] = [];
  let balance = scenario.principal;
  let totalInterestPaid = 0;
  let pmiDropPeriod: number | null = null;
  let everHadPmi = false;

  for (
    let periodNumber = 1;
    periodNumber <= scenario.termMonths;
    periodNumber++
  ) {
    const interestPortion = balance * monthlyRate;
    const scheduledPrincipal = Math.max(0, payment - interestPortion);
    const extra = extraForPeriod(
      scenario.extraPayments,
      periodNumber,
      scenario.startDate,
    );

    let principalThisPeriod = scheduledPrincipal + extra;
    const isPayoff =
      principalThisPeriod >= balance - 1e-6 ||
      periodNumber === scenario.termMonths;
    if (isPayoff) {
      principalThisPeriod = balance;
    }

    const remainingBalance = isPayoff ? 0 : balance - principalThisPeriod;
    const date = addMonthsClamped(scenario.startDate, periodNumber - 1);

    const endingLtv = remainingBalance / ltvBase;
    const pmiAppliesThisPeriod = pmiEligible && endingLtv > PMI_LTV_THRESHOLD;
    if (pmiAppliesThisPeriod) {
      everHadPmi = true;
    } else if (everHadPmi && pmiDropPeriod === null) {
      pmiDropPeriod = periodNumber;
    }

    const roundedPrincipal = roundCents(principalThisPeriod);
    const roundedInterest = roundCents(interestPortion);
    const roundedExtra = roundCents(Math.min(extra, principalThisPeriod));

    periods.push({
      periodNumber,
      date,
      paymentAmount: roundCents(roundedPrincipal + roundedInterest),
      principalPortion: roundedPrincipal,
      interestPortion: roundedInterest,
      extraPrincipalApplied: roundedExtra,
      remainingBalance: isPayoff ? 0 : roundCents(remainingBalance),
      pmiApplies: pmiAppliesThisPeriod,
    });

    totalInterestPaid += roundedInterest;
    balance = isPayoff ? 0 : remainingBalance;

    if (isPayoff) {
      break;
    }
  }

  if (everHadPmi && pmiDropPeriod === null) {
    // PMI was still active through the final period (never dropped off within the schedule).
    pmiDropPeriod = null;
  }

  const lastPeriod = periods[periods.length - 1];
  const monthlyPrincipalAndInterest = roundCents(payment);
  const monthlyExtras =
    (scenario.annualPropertyTax ?? 0) / 12 +
    (scenario.annualInsurance ?? 0) / 12 +
    (periods[0]?.pmiApplies ? monthlyPmiAmount : 0) +
    (scenario.monthlyHoa ?? 0);
  const totalMonthlyPayment = roundCents(
    monthlyPrincipalAndInterest + monthlyExtras,
  );

  const baselineComparison =
    scenario.extraPayments.length > 0
      ? (() => {
          const baseline = computeSchedule({ ...scenario, extraPayments: [] });
          return {
            periodsSaved: baseline.periods.length - periods.length,
            interestSaved: roundCents(
              baseline.summary.totalInterestPaid - totalInterestPaid,
            ),
          };
        })()
      : null;

  return {
    scenarioId: scenario.id,
    periods,
    summary: {
      totalInterestPaid: roundCents(totalInterestPaid),
      totalPaid: roundCents(
        periods.reduce((sum, p) => sum + p.paymentAmount, 0),
      ),
      payoffDate: lastPeriod.date,
      pmiDropPeriod,
      monthlyPrincipalAndInterest,
      totalMonthlyPayment,
      monthlyPmiAmount: everHadPmi ? roundCents(monthlyPmiAmount) : 0,
    },
    baselineComparison,
  };
}
