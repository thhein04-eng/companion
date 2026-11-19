import { cleanup, render, screen, within } from '@testing-library/react';
import { analyzeDeal } from 'deal-analyzer-calculations';
import {
  computeSchedule,
  DEFAULT_RENTAL_ASSUMPTIONS,
  type LoanScenario,
  type RentUnit,
} from 'shared-calculations';
import { afterEach, describe, expect, it } from 'vitest';
import { DealMetrics } from './deal-metrics';

afterEach(cleanup);

const unit = (over: Partial<RentUnit> & { id: string }): RentUnit => ({
  name: `Unit ${over.id.toUpperCase()}`,
  bedrooms: null,
  bathrooms: null,
  rent: 0,
  vacancyPct: null,
  ownerOccupied: false,
  rentAfterMoveOut: null,
  ...over,
});

/** The spec 012 reference duplex on a $300k / 7% / 30yr loan, tax $4,800, insurance $1,800. */
function duplex(unitB: number, owner = true): LoanScenario {
  return {
    id: 's',
    name: 'S',
    principal: 300_000,
    annualInterestRatePct: 7,
    termMonths: 360,
    startDate: '2027-01-01',
    paymentFrequency: 'monthly',
    homePrice: 400_000,
    downPayment: { percent: 25 },
    annualPropertyTax: 4_800,
    annualInsurance: 1_800,
    pmiAnnualRatePct: null,
    monthlyHoa: null,
    extraPayments: [],
    principalIsOverridden: false,
    rental: {
      ...DEFAULT_RENTAL_ASSUMPTIONS,
      grossMonthlyRent: 1_350 + unitB,
      units: [
        unit({
          id: 'a',
          rent: 1_350,
          ownerOccupied: owner,
          rentAfterMoveOut: owner ? 1_350 : null,
        }),
        unit({ id: 'b', rent: unitB }),
      ],
    },
  };
}
const metrics = (s: LoanScenario) =>
  render(<DealMetrics analysis={analyzeDeal(s, computeSchedule(s))} />);

describe('DealMetrics house-hack (spec 012 T027)', () => {
  it('shows the net housing cost while living there, and notes the rules use full rent', () => {
    metrics(duplex(1_400));
    const card = screen.getByTestId('net-housing-cost');
    expect(within(card).getByText('$1,467.91/mo')).toBeTruthy();
    expect(within(card).getByText('While you live in your unit')).toBeTruthy();
    expect(screen.getByTestId('rule-1-rule').textContent).toContain(
      'Based on full rent after move-out',
    );
  });

  it('reads "You live for free" when the other units cover everything', () => {
    metrics(duplex(4_000));
    const card = screen.getByTestId('net-housing-cost');
    expect(within(card).getByText('$0.00/mo')).toBeTruthy();
    expect(
      within(card).getByText('You live for free and net $534.09/mo'),
    ).toBeTruthy();
  });

  it('has no net housing cost card without an owner unit', () => {
    metrics(duplex(1_400, false));
    expect(screen.queryByTestId('net-housing-cost')).toBeNull();
    expect(screen.getByTestId('rule-1-rule').textContent).not.toContain(
      'full rent',
    );
  });
});
