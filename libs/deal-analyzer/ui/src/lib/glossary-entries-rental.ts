import type { GlossaryEntry } from './glossary-types';

/** Rental income, expenses and cash flow. Mirrors rent-roll.ts, rental-line-items.ts and analyze-deal.ts. */
export const RENTAL_ENTRIES: GlossaryEntry[] = [
  {
    id: 'rent-roll',
    name: 'Rent roll',
    aliases: ['units', 'rent per unit'],
    category: 'rental',
    definition:
      "The list of rentable units with each unit's monthly rent, bedrooms, bathrooms and vacancy.",
    purpose:
      'It lets a multi-unit property (up to 4 units) be analysed unit by unit.',
    formula: [
      "Rent roll total = sum of every unit's monthly rent (owner unit at its after-move-out rent)",
    ],
    notes: ['A rental without units is treated as one unit, "Unit A".'],
    usedOn: ['deal-analyzer', 'financing', 'wealth', 'pro-forma', 'sale'],
    related: ['gsi', 'house-hacking'],
  },
  {
    id: 'gsi',
    name: 'Gross scheduled income',
    abbreviation: 'GSI',
    aliases: ['gross rent', 'gross income'],
    category: 'rental',
    definition:
      'The rent you would collect if every unit were rented all the time, before vacancy and costs.',
    purpose:
      'It is the base for vacancy, management, maintenance and CapEx percentages.',
    formula: [
      'GSI (monthly) = (sum of unit rents + other income) × rent growth factor',
      'Annual = monthly × 12',
    ],
    notes: [
      'Utility reimbursements (RUBS) are not part of GSI; they are added to NOI.',
    ],
    usedOn: ['deal-analyzer', 'financing', 'wealth', 'pro-forma', 'sale'],
    related: ['noi', 'vacancy', 'rent-growth'],
  },
  {
    id: 'other-income',
    name: 'Other monthly income',
    aliases: ['parking', 'laundry', 'storage'],
    category: 'rental',
    definition:
      'Extra monthly income besides rent: parking, laundry, storage and similar.',
    purpose: 'It raises income, and percentage costs apply to it too.',
    notes: ['Added to GSI. The 1% Rule ignores it.'],
    usedOn: ['deal-analyzer'],
    related: ['gsi', 'one-percent-rule'],
  },
  {
    id: 'vacancy',
    name: 'Vacancy',
    aliases: ['vacancy rate'],
    category: 'rental',
    definition: 'The share of rent lost to empty units between tenants.',
    purpose: 'It makes income realistic. A common planning figure is about 5%.',
    formula: [
      'Vacancy loss = sum over units of (unit rent × rent growth × unit rate ÷ 100)',
      'A unit with no rate of its own uses the overall rate (default 5%, allowed 0–100%)',
    ],
    notes: ['The unit you live in has a 0% rate in the "Living there" view.'],
    usedOn: ['deal-analyzer', 'financing', 'wealth', 'pro-forma', 'sale'],
    related: ['gsi', 'house-hacking'],
  },
  {
    id: 'property-management',
    name: 'Property management',
    aliases: ['management fee'],
    category: 'rental',
    definition: 'A percentage of income paid to a manager (default 8%).',
    purpose:
      'It counts the cost of managing the property even if you do it yourself.',
    formula: ['Management = GSI × percent ÷ 100'],
    usedOn: ['deal-analyzer'],
    related: ['operating-expenses'],
  },
  {
    id: 'maintenance-reserve',
    name: 'Maintenance reserve',
    aliases: ['repairs'],
    category: 'rental',
    definition:
      'Money set aside each month for routine repairs (default 5% of income).',
    purpose:
      'Repairs are lumpy; a reserve smooths them so cash flow is not overstated.',
    formula: ['Maintenance = GSI × percent ÷ 100'],
    usedOn: ['deal-analyzer'],
    related: ['capex', 'operating-expenses'],
  },
  {
    id: 'capex',
    name: 'Capital expenditures',
    abbreviation: 'CapEx',
    aliases: ['capital expenditure', 'capex reserve'],
    category: 'rental',
    definition:
      'Big replacements such as a roof, HVAC or water heater; the app sets aside a percentage (default 5%).',
    purpose: 'It stops short-term cash flow from hiding future large bills.',
    formula: ['CapEx reserve = GSI × percent ÷ 100'],
    usedOn: ['deal-analyzer'],
    related: ['maintenance-reserve', 'operating-expenses'],
  },
  {
    id: 'operating-expenses',
    name: 'Operating expenses',
    abbreviation: 'OpEx',
    aliases: ['opex', 'expenses'],
    category: 'rental',
    definition:
      'The cost of running the property each month, not counting the loan.',
    purpose: 'Subtracting them from income gives NOI.',
    formula: [
      'OpEx = property tax ÷ 12 + insurance ÷ 12 + HOA + vacancy + management + maintenance + CapEx + custom expenses',
      'Fixed lines grow with the expense growth rate; percentage lines follow income',
    ],
    notes: ['Loan payments (debt service) are not operating expenses.'],
    usedOn: ['deal-analyzer', 'financing', 'wealth', 'pro-forma', 'sale'],
    related: ['noi', 'custom-expenses'],
  },
  {
    id: 'custom-expenses',
    name: 'Custom operating expenses',
    aliases: ['utilities', 'trash', 'landscaping'],
    category: 'rental',
    definition:
      'Your own expense lines (utilities, trash, landscaping...), each paid by you or billed to tenants.',
    purpose: 'It captures costs that the standard lines miss.',
    notes: [
      'Always counted at the full amount as an operating expense, whether you or the tenants pay.',
      'When tenants pay (RUBS), their share comes back as income.',
    ],
    usedOn: ['deal-analyzer'],
    related: ['rubs', 'operating-expenses'],
  },
  {
    id: 'rubs',
    name: 'Ratio utility billing system',
    abbreviation: 'RUBS',
    aliases: ['utility reimbursement'],
    category: 'rental',
    definition:
      "A way of splitting a building's utility bill among tenants and billing them for their share.",
    purpose:
      'It recovers part of the utility cost as income, which raises NOI.',
    formula: [
      'Reimbursement = bill × recovered % ÷ 100 × share',
      'share = sum over rent-paying units of (1 ÷ number of units) × (1 − unit vacancy ÷ 100)',
    ],
    notes: [
      'The unit count includes the unit you live in. Recovered % defaults to 100.',
      'Reimbursements are added to NOI, not to GSI.',
    ],
    usedOn: ['deal-analyzer'],
    related: ['custom-expenses', 'noi'],
    example: {
      inputs: 'Duplex, $180 monthly water bill billed to tenants, 0% vacancy',
      result:
        'Reimbursement $180 per month after move-out, $90 while you live in one unit',
    },
  },
  {
    id: 'house-hacking',
    name: 'House hacking',
    aliases: ['i live here', 'owner occupied', 'move out', 'living there'],
    category: 'rental',
    definition:
      'Living in one unit of the property while renting the others to cover the cost.',
    purpose:
      'It shows what living there really costs, then the return once you move out.',
    notes: [
      'Tick "I live here" on a unit. The "Living there" view sets that unit\'s rent and vacancy to $0; "After move-out" uses the rent you expect later.',
      'Projections switch to full rent after the move-out year (1–30, default 1).',
    ],
    usedOn: ['deal-analyzer', 'wealth', 'pro-forma', 'sale'],
    related: ['net-housing-cost', 'rent-roll'],
  },
  {
    id: 'net-housing-cost',
    name: 'Net housing cost',
    category: 'rental',
    definition:
      "What living in your unit costs after your tenants' rent and reimbursements are applied.",
    purpose: 'It tells you whether you live almost free or pay a lot.',
    formula: [
      'Net housing cost = −(pre-tax cash flow), per month and per year',
    ],
    notes: [
      'Shown only in the "Living there" view of a house-hacked deal. If cash flow is positive it reads "You live for free and net $X/mo".',
    ],
    usedOn: ['deal-analyzer'],
    related: ['house-hacking', 'cash-flow'],
  },
  {
    id: 'noi',
    name: 'Net operating income',
    abbreviation: 'NOI',
    category: 'rental',
    definition:
      'Income left after operating expenses, before the loan and taxes.',
    purpose:
      'It measures how much the property itself earns, independent of how it is financed.',
    formula: [
      'NOI (monthly) = GSI + RUBS reimbursements − operating expenses',
      'NOI (annual) = monthly × 12',
    ],
    usedOn: ['deal-analyzer', 'financing', 'wealth', 'pro-forma', 'sale'],
    related: ['cap-rate', 'dscr', 'cash-flow'],
    example: {
      inputs:
        '$2,400 rent, 5% vacancy, 8% management, 5% maintenance, 5% CapEx, $3,000 tax, $1,200 insurance',
      result: 'NOI = $1,498 per month, $17,976 per year',
    },
  },
  {
    id: 'debt-service',
    name: 'Debt service',
    category: 'rental',
    definition:
      'What you pay the lender each year: principal and interest, plus PMI while it applies.',
    purpose: 'Subtracting it from NOI gives cash flow.',
    formula: [
      'Year 1 = P&I × months paid (up to 12) + PMI × months it applies',
    ],
    notes: [
      'Extra principal is not included. Years after payoff or past the term have none.',
      'DSCR uses P&I only, so it differs from this by any PMI.',
    ],
    usedOn: ['deal-analyzer', 'pro-forma', 'wealth', 'sale'],
    related: ['principal-and-interest', 'pmi', 'cash-flow'],
  },
  {
    id: 'cash-flow',
    name: 'Pre-tax cash flow',
    aliases: ['cash flow', 'cash flow per month'],
    category: 'rental',
    definition:
      'What is left each period after paying operating expenses and the loan, before income tax.',
    purpose: 'It shows whether the rental pays for itself.',
    formula: [
      'Cash flow (annual) = NOI − debt service',
      'Monthly = annual ÷ 12',
    ],
    usedOn: ['deal-analyzer', 'financing', 'wealth', 'pro-forma', 'sale'],
    related: ['noi', 'debt-service', 'cash-on-cash'],
    example: {
      inputs: 'NOI $17,976/yr, debt service $14,969.28/yr',
      result: 'Cash flow = $3,006.72 per year ($250.56 per month)',
    },
  },
  {
    id: 'total-cash-invested',
    name: 'Total cash invested',
    aliases: ['cash invested', 'cash to close'],
    category: 'rental',
    definition: 'The cash you put in to buy and ready the property.',
    purpose:
      'It is the denominator for cash-on-cash, equity multiple, IRR and sale return.',
    formula: ['Cash invested = down payment + closing costs + rehab budget'],
    notes: ['For a sale without a rental, only the down payment counts.'],
    usedOn: ['deal-analyzer', 'financing', 'wealth', 'pro-forma', 'sale'],
    related: ['closing-costs', 'rehab-budget', 'down-payment'],
    example: {
      inputs: '$62,500 down, $7,500 closing, $10,000 rehab',
      result: 'Cash invested = $80,000',
    },
  },
  {
    id: 'closing-costs',
    name: 'Closing costs',
    category: 'rental',
    definition:
      'Fees paid at purchase (lender, title, legal and similar), entered as a dollar amount.',
    purpose:
      'They add to the cash you need and to your cost basis for the sale tax estimate.',
    notes: [
      'Default $0. Included in adjusted basis, but not in the depreciable basis.',
    ],
    usedOn: ['deal-analyzer', 'sale'],
    related: ['total-cash-invested', 'adjusted-basis'],
  },
  {
    id: 'rehab-budget',
    name: 'Rehab budget',
    aliases: ['renovation'],
    category: 'rental',
    definition:
      'The money spent on repairs or improvements right after buying.',
    purpose: 'It adds to cash invested and to the depreciable basis.',
    notes: ['Default $0.'],
    usedOn: ['deal-analyzer', 'wealth', 'sale'],
    related: ['total-cash-invested', 'depreciation'],
  },
  {
    id: 'rent-growth',
    name: 'Rent and expense growth',
    aliases: ['growth assumptions', 'rent growth', 'expense growth'],
    category: 'rental',
    definition:
      'Yearly percentage by which rent and costs are assumed to rise in multi-year projections.',
    purpose:
      'It lets charts and projections show how cash flow changes over time.',
    formula: [
      'Year N factor = (1 + growth ÷ 100)^(N − 1)  (no growth in year 1)',
    ],
    notes: [
      'Default 0%, allowed −10% to 25%. The same values are shared across pages.',
    ],
    usedOn: ['deal-analyzer', 'wealth', 'pro-forma', 'sale'],
    related: ['gsi', 'appreciation'],
  },
];
