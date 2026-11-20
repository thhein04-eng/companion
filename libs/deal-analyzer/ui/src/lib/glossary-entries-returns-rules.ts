import type { GlossaryEntry } from './glossary-types';

/** Return metrics and rules of thumb. Mirrors analyze-deal.ts and rules.ts. */
export const RETURNS_RULES_ENTRIES: GlossaryEntry[] = [
  {
    id: 'cap-rate',
    name: 'Capitalization rate',
    abbreviation: 'Cap rate',
    aliases: ['cap rate', 'capitalization rate'],
    category: 'returns',
    definition: 'The yearly NOI as a percentage of the purchase price.',
    purpose:
      'It compares properties on income alone, independent of financing.',
    formula: ['Cap rate = annual NOI ÷ purchase price'],
    notes: ['N/A when there is no purchase price.'],
    usedOn: ['deal-analyzer'],
    related: ['noi'],
    example: {
      inputs: 'NOI $17,976/yr on a $250,000 purchase',
      result: 'Cap rate = 7.19%',
    },
  },
  {
    id: 'cash-on-cash',
    name: 'Cash-on-cash return',
    abbreviation: 'CoC',
    aliases: ['cash on cash', 'coc'],
    category: 'returns',
    definition:
      'The yearly pre-tax cash flow as a percentage of the cash you invested.',
    purpose: 'It shows the yearly yield on your own money, after the loan.',
    formula: ['Cash-on-cash = annual pre-tax cash flow ÷ total cash invested'],
    notes: [
      'N/A when no cash is invested. Negative cash flow gives a negative return.',
      "In year-by-year charts each year's cash flow is divided by the initial cash invested.",
    ],
    usedOn: ['deal-analyzer', 'financing'],
    related: ['cash-flow', 'total-cash-invested'],
    example: {
      inputs: 'Cash flow $3,006.72/yr on $80,000 invested',
      result: 'Cash-on-cash = 3.76%',
    },
  },
  {
    id: 'pro-forma',
    name: 'Pro forma',
    aliases: ['proforma', 'projection table'],
    category: 'returns',
    definition:
      'A projected year-by-year table of income, expenses, cash flow, tax and loan balance.',
    purpose:
      'It shows how a hold plays out over several years instead of just year one.',
    notes: [
      'Columns include gross income, operating expenses, NOI, debt service, extra principal, cash to investor, interest, depreciation, taxable income, tax effect, after-tax cash flow, loan balance and property value.',
    ],
    usedOn: ['pro-forma'],
    related: ['cash-to-investor', 'hold-period'],
  },
  {
    id: 'one-percent-rule',
    name: '1% Rule',
    aliases: ['one percent rule'],
    category: 'rules',
    definition:
      'A quick screen: monthly rent should be at least 1% of the purchase price.',
    purpose:
      'It filters deals fast before a full analysis. It is a guideline, not a guarantee.',
    formula: [
      'Target rent = price × 1%',
      'Pass when full monthly rent ≥ target rent',
    ],
    notes: [
      'Full rent is the whole rent roll with your own unit at its after-move-out rent, in either view.',
      'Other income is not counted. N/A with no purchase price.',
    ],
    usedOn: ['deal-analyzer'],
    related: ['rent-roll', 'fifty-percent-rule'],
    example: {
      inputs: '$250,000 price, $2,400 rent',
      result: 'Target $2,500 → Fail',
    },
  },
  {
    id: 'fifty-percent-rule',
    name: '50% Rule',
    aliases: ['fifty percent rule'],
    category: 'rules',
    definition:
      'A rule of thumb that operating expenses (not the mortgage) run about half of gross rent.',
    purpose:
      'It gives a quick expense sanity check and a rough cash flow before details.',
    formula: [
      'Expense ratio = operating expenses ÷ GSI;  pass when ≤ 50%',
      'Rule estimate (monthly) = 0.5 × GSI − monthly debt service',
    ],
    notes: [
      'Uses full rent (your own unit at its after-move-out rent). Reimbursements are not in the ratio.',
      'N/A when GSI is $0 or less.',
    ],
    usedOn: ['deal-analyzer'],
    related: ['operating-expenses', 'gsi'],
    example: {
      inputs: 'Expenses $902/mo on GSI $2,400/mo',
      result: 'Ratio 37.6% → Pass; rule estimate −$47.44/mo',
    },
  },
];
