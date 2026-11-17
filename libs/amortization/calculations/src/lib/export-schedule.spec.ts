import { describe, expect, it } from 'vitest';
import { scheduleToCsv } from './export-schedule';
import { computeSchedule, type LoanScenario } from 'shared-calculations';

describe('scheduleToCsv', () => {
  it('writes a header row plus one row per period, in field order', () => {
    const scenario: LoanScenario = {
      id: 's1',
      name: 'Baseline',
      principal: 10_000,
      annualInterestRatePct: 5,
      termMonths: 3,
      startDate: '2027-01-01',
      paymentFrequency: 'monthly',
      homePrice: null,
      downPayment: null,
      annualPropertyTax: null,
      annualInsurance: null,
      pmiAnnualRatePct: null,
      monthlyHoa: null,
      extraPayments: [],
      principalIsOverridden: false,
    };
    const schedule = computeSchedule(scenario);
    const csv = scheduleToCsv(schedule);
    const lines = csv.split('\n');

    expect(lines[0]).toBe(
      'Payment #,Date,Payment,Principal,Interest,Remaining Balance',
    );
    expect(lines).toHaveLength(schedule.periods.length + 1);
    expect(lines[1].startsWith('1,2027-01-01,')).toBe(true);
  });
});
