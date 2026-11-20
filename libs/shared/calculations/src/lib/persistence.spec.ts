import { describe, expect, it } from 'vitest';
import { deserializeScenarios, serializeScenarios } from './persistence';
import type { LoanScenario, RentalAssumptions } from './types';

function scenario(overrides: Partial<LoanScenario> = {}): LoanScenario {
  return {
    id: 'scenario-1',
    name: 'Scenario 1',
    principal: 187_500,
    annualInterestRatePct: 7,
    termMonths: 360,
    startDate: '2027-01-01',
    paymentFrequency: 'monthly',
    homePrice: 250_000,
    downPayment: { percent: 25 },
    annualPropertyTax: 3_000,
    annualInsurance: 1_200,
    pmiAnnualRatePct: null,
    monthlyHoa: null,
    extraPayments: [],
    principalIsOverridden: false,
    ...overrides,
  };
}

const rental: RentalAssumptions = {
  grossMonthlyRent: 2_400,
  otherMonthlyIncome: 0,
  vacancyPct: 5,
  managementPct: 8,
  maintenanceReservePct: 5,
  capexReservePct: 5,
  closingCosts: 7_500,
  rehabBudget: 10_000,
};

describe('deserializeScenarios (FR-016)', () => {
  it('normalizes a pre-Deal-Analyzer payload without `rental` to rental === null', () => {
    const legacy = scenario();
    delete (legacy as Partial<LoanScenario>).rental;
    const raw = JSON.stringify({
      scenarios: [legacy],
      activeScenarioId: 'scenario-1',
    });
    const state = deserializeScenarios(raw);
    expect(state?.scenarios[0].rental).toBeNull();
  });

  it('round-trips a scenario with rental assumptions deep-equal', () => {
    const scenarios = [scenario({ rental })];
    const state = deserializeScenarios(
      serializeScenarios(scenarios, 'scenario-1'),
    );
    expect(state).toEqual({ scenarios, activeScenarioId: 'scenario-1' });
  });

  it('loads a pre-financing rental without dscrMinimum/financing/financingSelection (spec 006 FR-013)', () => {
    const state = deserializeScenarios(
      serializeScenarios([scenario({ rental })], 'scenario-1'),
    );
    const loaded = state?.scenarios[0].rental as RentalAssumptions;
    expect(loaded.dscrMinimum).toBeUndefined();
    expect(loaded.financing).toBeUndefined();
    expect(loaded.financingSelection).toBeUndefined();
  });

  it('round-trips financing terms, minimum DSCR and selection unchanged', () => {
    const withFinancing: RentalAssumptions = {
      ...rental,
      dscrMinimum: 1.15,
      financingSelection: 'arm',
      financing: {
        conventional: { downPaymentPct: 25, annualRatePct: 7, termYears: 30 },
        arm: {
          downPaymentPct: 25,
          annualRatePct: 6.5,
          termYears: 30,
          fixedPeriodYears: 7,
          adjustedRatePct: 8.5,
        },
        dscr: { downPaymentPct: 20, annualRatePct: 7.5, termYears: 30 },
      },
    };
    const scenarios = [scenario({ rental: withFinancing })];
    const state = deserializeScenarios(
      serializeScenarios(scenarios, 'scenario-1'),
    );
    expect(state).toEqual({ scenarios, activeScenarioId: 'scenario-1' });
  });

  it('round-trips a rent roll, house-hack plan and RUBS tags unchanged (spec 012)', () => {
    const multi = scenario({
      rental: {
        ...rental,
        grossMonthlyRent: 2_750,
        units: [
          {
            id: 'a',
            name: 'Unit A',
            bedrooms: 2,
            bathrooms: 1,
            rent: 0,
            vacancyPct: null,
            ownerOccupied: true,
            rentAfterMoveOut: 1_350,
          },
          {
            id: 'b',
            name: 'Basement',
            bedrooms: 1,
            bathrooms: 1.5,
            rent: 1_400,
            vacancyPct: 10,
            ownerOccupied: false,
            rentAfterMoveOut: null,
          },
        ],
        moveOutYears: 2,
        occupancyView: 'afterMoveOut',
        customExpenses: [
          {
            id: 'w',
            label: 'Water',
            monthlyAmount: 180,
            paidBy: 'rubs',
            recoveryPct: 80,
          },
        ],
      },
    });
    expect(
      deserializeScenarios(serializeScenarios([multi], multi.id))?.scenarios,
    ).toEqual([multi]);
  });

  it('round-trips the sensitivity target unchanged (spec 017)', () => {
    const withTarget = scenario({
      rental: {
        ...rental,
        sensitivity: {
          targetMeasure: 'cashFlow',
          cashOnCashPct: 9.5,
          cashFlowMonthly: 425,
        },
      },
    });
    expect(
      deserializeScenarios(serializeScenarios([withTarget], withTarget.id))
        ?.scenarios,
    ).toEqual([withTarget]);
  });

  it('returns null for corrupt JSON and never throws', () => {
    expect(deserializeScenarios('{not json')).toBeNull();
    expect(deserializeScenarios(null)).toBeNull();
  });
});
