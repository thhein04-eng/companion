import { describe, expect, it } from 'vitest';
import {
  computeLtv,
  computeSchedule,
  monthlyPayment,
  remainingBalance,
  type LoanScenario,
} from 'shared-calculations';
import {
  analyzeDeal,
  analyzeSale,
  buildFinancingMatrix,
  computeDscr,
  irr,
} from 'deal-analyzer-calculations';
import { GLOSSARY_ENTRIES, GLOSSARY_LINKED_IDS } from './glossary-entries';
import { filterGlossary } from './glossary-filter';
import {
  GLOSSARY_CATEGORIES,
  GLOSSARY_ROUTES,
  type GlossaryEntry,
} from './glossary-types';

/** The research.md "Term inventory", one id per term. Update both together. */
const INVENTORY_IDS = [
  // Loan
  'principal-and-interest',
  'amortization-schedule',
  'remaining-balance',
  'loan-term',
  'interest-rate',
  'loan-amount',
  'down-payment',
  'home-price',
  'ltv',
  'pmi',
  'property-tax',
  'insurance',
  'hoa',
  'total-monthly-payment',
  'extra-payments',
  'total-interest',
  'total-cost',
  'payoff-date',
  // Rental income & expenses
  'rent-roll',
  'gsi',
  'other-income',
  'vacancy',
  'property-management',
  'maintenance-reserve',
  'capex',
  'operating-expenses',
  'custom-expenses',
  'rubs',
  'house-hacking',
  'net-housing-cost',
  'noi',
  'debt-service',
  'cash-flow',
  'total-cash-invested',
  'closing-costs',
  'rehab-budget',
  'rent-growth',
  // Return metrics & rules
  'cap-rate',
  'cash-on-cash',
  'pro-forma',
  'one-percent-rule',
  'fifty-percent-rule',
  // Financing & DSCR
  'dscr',
  'minimum-dscr',
  'rent-for-dscr',
  'conventional-loan',
  'arm',
  'dscr-loan',
  'financing-matrix',
  // Hold & Exit
  'hold-period',
  'selling-costs',
  'sale-price',
  'loan-payoff',
  'net-sale-proceeds',
  'cash-to-investor',
  'total-net-profit',
  'equity-multiple',
  'irr',
  'after-tax-returns',
  // Wealth
  'projection-horizon',
  'property-value',
  'equity',
  'appreciation',
  'forced-appreciation',
  'cumulative-cash-flow',
  'net-worth',
  'net-worth-multiple',
  'depreciation',
  'land-share',
  'marginal-tax-rate',
  'annual-interest',
  'taxable-income',
  'tax-effect',
  // Sale & tax
  'exit-timing',
  'sale-return',
  'sale-verdict',
  'break-even-price',
  'price-cushion',
  'depreciation-taken',
  'adjusted-basis',
  'taxable-gain',
  'depreciation-recapture',
  'capital-gains-tax',
  'after-tax-net-profit',
];

describe('glossary entries: integrity', () => {
  const ids = GLOSSARY_ENTRIES.map((e) => e.id);

  it('has unique kebab-case ids', () => {
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('contains every inventoried term and nothing the app does not compute as a metric', () => {
    expect([...ids].sort()).toEqual([...INVENTORY_IDS].sort());
    for (const absent of [
      'apr',
      'grm',
      'escrow',
      'dti',
      'npv',
      'two-percent-rule',
    ])
      expect(ids).not.toContain(absent);
  });

  it('has valid references, routes and categories', () => {
    const categories = new Set(GLOSSARY_CATEGORIES.map((c) => c.id));
    for (const e of GLOSSARY_ENTRIES) {
      expect(categories.has(e.category), e.id).toBe(true);
      expect(e.usedOn.length, e.id).toBeGreaterThan(0);
      for (const r of e.usedOn)
        expect(GLOSSARY_ROUTES[r], `${e.id} → ${r}`).toBeDefined();
      for (const rel of e.related ?? [])
        expect(ids, `${e.id} related ${rel}`).toContain(rel);
      expect(e.definition.trim().length, e.id).toBeGreaterThan(0);
      expect(e.purpose.trim().length, e.id).toBeGreaterThan(0);
      if (e.formula) {
        expect(e.formula.length, e.id).toBeGreaterThan(0);
        for (const line of e.formula)
          expect(line.trim().length).toBeGreaterThan(0);
      }
    }
    for (const c of GLOSSARY_CATEGORIES)
      expect(
        GLOSSARY_ENTRIES.some((e) => e.category === c.id),
        c.id,
      ).toBe(true);
  });

  it('keeps popover-linked ids a subset of the entries', () => {
    for (const id of GLOSSARY_LINKED_IDS) expect(ids).toContain(id);
  });

  it('finds each term by its name and by its abbreviation first', () => {
    for (const e of GLOSSARY_ENTRIES) {
      expect(
        filterGlossary(GLOSSARY_ENTRIES, { query: e.name }).map((x) => x.id),
        e.id,
      ).toContain(e.id);
      if (e.abbreviation)
        expect(
          filterGlossary(GLOSSARY_ENTRIES, { query: e.abbreviation })[0]?.id,
          e.id,
        ).toBe(e.id);
    }
  });
});

/** Reference vector A (specs 002 / 006): the numbers every example below uses. */
const SCENARIO: LoanScenario = {
  id: 'glossary-a',
  name: 'A',
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
  rental: {
    grossMonthlyRent: 2_400,
    otherMonthlyIncome: 0,
    vacancyPct: 5,
    managementPct: 8,
    maintenanceReservePct: 5,
    capexReservePct: 5,
    closingCosts: 7_500,
    rehabBudget: 10_000,
  },
} as LoanScenario;

const example = (id: string): GlossaryEntry['example'] =>
  GLOSSARY_ENTRIES.find((e) => e.id === id)?.example;

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

describe('glossary examples match the real calculations (FR-007, SC-002)', () => {
  const schedule = computeSchedule(SCENARIO);
  const deal = analyzeDeal(SCENARIO, schedule);

  it('P&I', () => {
    const p = monthlyPayment(187_500, 7, 360);
    expect(example('principal-and-interest')?.result).toBe(
      `P&I = ${usd(Math.round(p * 100) / 100)} per month`,
    );
    expect(schedule.summary.monthlyPrincipalAndInterest).toBe(1_247.44);
  });

  it('remaining balance after 60 payments', () => {
    const b = remainingBalance(187_500, 7, 360, 60);
    expect(example('remaining-balance')?.result).toBe(
      `Balance = ${usd(Math.round(b * 100) / 100)}`,
    );
  });

  it('LTV', () => {
    expect(computeLtv(SCENARIO).value).toBe(0.75);
    expect(example('ltv')?.result).toBe('LTV = 75%');
  });

  it('NOI, cash flow, cash invested', () => {
    expect(deal.netOperatingIncome).toEqual({ monthly: 1_498, annual: 17_976 });
    expect(example('noi')?.result).toBe(
      'NOI = $1,498 per month, $17,976 per year',
    );
    expect(deal.debtService.annual).toBe(14_969.28);
    expect(deal.cashFlow).toEqual({ monthly: 250.56, annual: 3_006.72 });
    expect(example('cash-flow')?.result).toBe(
      'Cash flow = $3,006.72 per year ($250.56 per month)',
    );
    expect(deal.totalCashInvested).toBe(80_000);
    expect(example('total-cash-invested')?.result).toBe(
      'Cash invested = $80,000',
    );
  });

  it('cap rate and cash-on-cash', () => {
    expect(example('cap-rate')?.result).toBe(
      `Cap rate = ${pct(deal.capRate.value as number)}`,
    );
    expect(example('cash-on-cash')?.result).toBe(
      `Cash-on-cash = ${pct(deal.cashOnCashReturn.value as number)}`,
    );
  });

  it('1% and 50% rules', () => {
    expect(deal.onePercentRule).toMatchObject({
      pass: false,
      targetRent: 2_500,
    });
    expect(example('one-percent-rule')?.result).toBe('Target $2,500 → Fail');
    expect(deal.fiftyPercentRule).toMatchObject({
      withinRule: true,
      estimatedMonthlyCashFlow: -47.44,
    });
    expect(deal.fiftyPercentRule?.opexRatio).toBeCloseTo(0.3758, 4);
    expect(example('fifty-percent-rule')?.result).toBe(
      'Ratio 37.6% → Pass; rule estimate −$47.44/mo',
    );
  });

  it('DSCR and rent needed for 1.25×', () => {
    const d = computeDscr({
      scenario: SCENARIO,
      annualNoi: deal.netOperatingIncome.annual,
      monthlyPrincipalAndInterest: schedule.summary.monthlyPrincipalAndInterest,
      minimum: 1.25,
    });
    expect((d.value as number).toFixed(2)).toBe('1.20');
    expect(example('dscr')?.result).toBe('DSCR = 1.20×');
    expect(d.rentForMinimum).toBe(2_479.61);
    expect(example('rent-for-dscr')?.result).toBe(
      'Rent needed = $2,479.61 per month',
    );
  });

  it('IRR', () => {
    const r = irr([-80_000, 3_000, 3_000, 3_000, 123_000]) as number;
    expect(example('irr')?.result).toBe(`IRR = ${pct(r)}`);
  });

  it('sale price, net proceeds and break-even (non-rental, 60 months)', () => {
    const s = {
      ...SCENARIO,
      rental: undefined,
      sale: { appreciationPct: 3, sellingCostsPct: 7, exitMonth: 60 },
    } as LoanScenario;
    const r = analyzeSale(s, computeSchedule(s)).result;
    expect(r).not.toBeNull();
    expect(r?.salePrice).toBe(289_818.52);
    expect(example('sale-price')?.result).toBe('Sale price = $289,818.52');
    expect(r?.sellingCosts).toBe(20_287.3);
    expect(r?.remainingBalance).toBe(176_496.73);
    expect(r?.netSaleProceeds).toBe(93_034.49);
    expect(example('net-sale-proceeds')?.result).toBe(
      'Net proceeds = $93,034.49',
    );
    expect(r?.breakEven.salePrice).toBe(256_985.73);
    expect(example('break-even-price')?.result).toBe(
      'Break-even price = $256,985.73',
    );
  });
});

describe('glossary tax, ARM and RUBS examples match the real calculations (FR-007)', () => {
  it('sale tax block, 120 months at 3% a year', () => {
    const s = {
      ...SCENARIO,
      rental: { ...SCENARIO.rental, appreciationPct: 3 },
      sale: { exitMonth: 120, tax: { enabled: true } },
    } as LoanScenario;
    const r = analyzeSale(s, computeSchedule(s)).result;
    expect(r?.salePrice).toBe(335_979.09);
    expect(r?.sellingCosts).toBe(23_518.54);
    expect(r?.tax).toMatchObject({
      depreciableBasis: 210_000,
      depreciationTaken: 76_363.6,
      adjustedBasis: 191_136.4,
      taxableGain: 121_324.15,
      recaptureTax: 19_090.9,
      capitalGain: 44_960.55,
      capitalGainsTax: 6_744.08,
      totalTax: 25_834.98,
      afterTaxNetProfit: 75_794.55,
    });
    expect(example('depreciation-taken')?.result).toContain('$76,363.60');
    expect(example('adjusted-basis')?.result).toBe(
      'Adjusted basis = $191,136.40',
    );
    expect(example('taxable-gain')?.result).toContain('= $121,324.15');
    expect(example('depreciation-recapture')?.result).toContain('= $19,090.90');
    expect(example('capital-gains-tax')?.result).toContain('= $6,744.08');
    expect(example('after-tax-net-profit')?.result).toContain('= $75,794.55');
  });

  it('ARM initial and reset payments', () => {
    const analysis = analyzeDeal(SCENARIO, computeSchedule(SCENARIO));
    const arm = buildFinancingMatrix(SCENARIO, analysis).options?.find(
      (o) => o.id === 'arm',
    );
    expect(arm?.phases?.map((p) => p.monthlyPrincipalAndInterest)).toEqual([
      1_185.13, 1_400.47,
    ]);
    expect(example('arm')?.result).toBe(
      'P&I $1,185.13 in years 1–7, $1,400.47 after the reset',
    );
  });

  it('RUBS reimbursement before and after the owner moves out', () => {
    const duplex = {
      ...SCENARIO,
      rental: {
        ...SCENARIO.rental,
        grossMonthlyRent: 2_750,
        vacancyPct: 0,
        units: [
          {
            id: 'a',
            name: 'Unit A',
            bedrooms: 2,
            bathrooms: 1,
            rent: 1_350,
            vacancyPct: null,
            ownerOccupied: true,
            rentAfterMoveOut: 1_350,
          },
          {
            id: 'b',
            name: 'Unit B',
            bedrooms: 2,
            bathrooms: 1,
            rent: 1_400,
            vacancyPct: null,
            ownerOccupied: false,
            rentAfterMoveOut: null,
          },
        ],
        customExpenses: [
          { id: 'w', label: 'Water/Sewer', monthlyAmount: 180, paidBy: 'rubs' },
        ],
      },
    } as unknown as LoanScenario;
    const sch = computeSchedule(duplex);
    const after = analyzeDeal(duplex, sch, { view: 'afterMoveOut' });
    const living = analyzeDeal(duplex, sch, { view: 'living' });
    expect(after.income.reimbursements.monthly).toBe(180);
    expect(living.income.reimbursements.monthly).toBe(90);
    expect(example('rubs')?.result).toBe(
      'Reimbursement $180 per month after move-out, $90 while you live in one unit',
    );
  });
});
