import { computeSchedule, type LoanScenario } from 'shared-calculations';
import { describe, expect, it } from 'vitest';
import { referenceScenario } from './__fixtures__/dscr-reference';
import { generatedScenarios } from './__fixtures__/generated-scenarios';
import { analyzeDeal } from './analyze-deal';
import { analyzeSale } from './analyze-sale';
import { projectExit } from './project-exit';
import { projectRental } from './project-rental';
import { projectWealth } from './project-wealth';

/**
 * Spec 012 SC-001 / T002 + T010: the rent roll, house-hacking and RUBS must not change any result
 * for a scenario without units. The snapshot file was written before any spec 012 calculation
 * change (T002); this test compares every later build against it. Fields spec 012 adds are
 * stripped before comparing (they don't exist in the baseline).
 */
const SPEC_012_FIELDS = new Set([
  'view',
  'income',
  'unitBreakdown',
  'netHousingCost',
  'moveOutYear',
  'reimbursementMonthly',
]);

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SPEC_012_FIELDS.has(key))
        .map(([key, v]) => [key, strip(v)]),
    );
  }
  return value;
}

const scenarios: LoanScenario[] = [
  referenceScenario(),
  // Other income, odd vacancy and custom expenses: the inputs spec 012 touches (vacancy base, RUBS).
  referenceScenario(
    { id: 'other-income' },
    { otherMonthlyIncome: 135.55, vacancyPct: 7.3 },
  ),
  referenceScenario(
    { id: 'custom-expenses' },
    {
      grossMonthlyRent: 2_745.67,
      vacancyPct: 4.9,
      customExpenses: [
        { id: 'w', label: 'Water/Sewer', monthlyAmount: 180.33 },
        { id: 't', label: 'Trash', monthlyAmount: 45 },
      ],
      rentGrowthPct: 3.1,
      expenseGrowthPct: 2.2,
    },
  ),
  referenceScenario(
    { id: 'all-lines' },
    {
      grossMonthlyRent: 1_999.99,
      otherMonthlyIncome: 75.01,
      vacancyPct: 12.5,
      managementPct: 8.7,
      customExpenses: [{ label: 'Landscaping', monthlyAmount: 61.17 }],
    },
  ),
  ...generatedScenarios(24),
];

describe('golden baseline (spec 012 SC-001)', () => {
  it('every pre-spec-012 scenario gives exactly the baseline results', async () => {
    const output = scenarios.map((scenario) => {
      const schedule = computeSchedule(scenario);
      return {
        id: scenario.id,
        analyzeDeal: analyzeDeal(scenario, schedule),
        projectRental: projectRental(scenario, schedule),
        projectWealth: projectWealth(scenario, schedule),
        projectExit: projectExit(scenario, schedule),
        analyzeSale: analyzeSale(scenario, schedule),
      };
    });
    await expect(JSON.stringify(strip(output), null, 1)).toMatchFileSnapshot(
      './__fixtures__/golden-baseline.json',
    );
  });
});
