import type { GlossaryEntry } from './glossary-types';

/** Hold & Exit pro forma. Mirrors project-exit.ts, cash-to-investor.ts and irr.ts. */
export const EXIT_ENTRIES: GlossaryEntry[] = [
  {
    id: 'hold-period',
    name: 'Hold period',
    aliases: ['hold', 'holding period'],
    category: 'exit',
    definition: 'How many whole years you keep the property before selling.',
    purpose:
      'Returns change with time; the page compares 5, 7 and 10 years and your own choice.',
    notes: ['Whole years from 1 to 30; default 7.'],
    usedOn: ['pro-forma', 'sale'],
    related: ['irr', 'equity-multiple'],
  },
  {
    id: 'selling-costs',
    name: 'Selling costs',
    aliases: ['commissions', 'closing costs on sale'],
    category: 'exit',
    definition:
      'Agent commissions, transfer taxes and closing costs paid when you sell.',
    purpose: 'They reduce what you keep from the sale.',
    formula: ['Selling costs = sale price × percent ÷ 100'],
    notes: ['Default 7%, allowed 0–15%.'],
    usedOn: ['pro-forma', 'sale'],
    related: ['net-sale-proceeds'],
  },
  {
    id: 'sale-price',
    name: 'Projected sale price',
    aliases: ['sale price'],
    category: 'exit',
    definition: 'What the property is assumed to sell for after appreciation.',
    purpose: 'It starts the exit calculation.',
    formula: [
      'Hold & Exit (whole years): (price + forced appreciation) × (1 + appreciation ÷ 100)^years',
      'Sale Profit (any month): price × (1 + appreciation ÷ 100)^(months ÷ 12)',
    ],
    notes: [
      'The Sale Profit page does not add forced appreciation; it shows a note when one is set elsewhere.',
    ],
    usedOn: ['pro-forma', 'sale'],
    related: ['appreciation', 'forced-appreciation'],
    example: {
      inputs: '$250,000 at 3% a year, sold after 60 months',
      result: 'Sale price = $289,818.52',
    },
  },
  {
    id: 'loan-payoff',
    name: 'Loan payoff',
    aliases: ['remaining loan balance at sale'],
    category: 'exit',
    definition: 'The loan balance you repay the lender when you sell.',
    purpose: 'It is deducted from the sale price.',
    formula: [
      'Loan payoff = remaining balance at the exit month (0 if the loan is already paid off)',
    ],
    usedOn: ['pro-forma', 'sale'],
    related: ['remaining-balance', 'net-sale-proceeds'],
  },
  {
    id: 'net-sale-proceeds',
    name: 'Net sale proceeds',
    aliases: ['net proceeds'],
    category: 'exit',
    definition:
      'The cash you walk away with from the sale after costs and the loan payoff.',
    purpose:
      'It is the exit cash flow used in profit, IRR and equity multiple.',
    formula: ['Net proceeds = sale price − selling costs − loan payoff'],
    notes: ['Can be negative, which means you would owe cash at closing.'],
    usedOn: ['pro-forma', 'sale'],
    related: ['sale-price', 'selling-costs', 'loan-payoff'],
    example: {
      inputs: '$289,818.52 sale, 7% costs, $176,496.73 payoff',
      result: 'Net proceeds = $93,034.49',
    },
  },
  {
    id: 'cash-to-investor',
    name: 'Cash to investor',
    aliases: ['investor cash'],
    category: 'exit',
    definition:
      'The cash you actually receive each year after the loan and any extra principal.',
    purpose: 'It is the yearly cash flow used for IRR and profit.',
    formula: ['Cash to investor = NOI − debt service − extra principal'],
    notes: ['Debt service is 0 after the loan term.'],
    usedOn: ['pro-forma', 'sale'],
    related: ['noi', 'debt-service', 'extra-payments'],
  },
  {
    id: 'total-net-profit',
    name: 'Total net profit',
    aliases: ['net profit'],
    category: 'exit',
    definition: 'Everything you got back minus everything you put in.',
    purpose: 'It answers "did I make money overall?".',
    formula: [
      'Total net profit = sum of cash flows + net sale proceeds − total cash invested',
    ],
    usedOn: ['pro-forma', 'sale'],
    related: ['net-sale-proceeds', 'total-cash-invested'],
  },
  {
    id: 'equity-multiple',
    name: 'Equity multiple',
    aliases: ['multiple'],
    category: 'exit',
    definition: 'Total cash returned divided by cash invested.',
    purpose:
      'A 2.00× multiple means you got back double your investment, regardless of how long it took.',
    formula: [
      'Equity multiple = (sum of cash flows + net sale proceeds) ÷ total cash invested',
    ],
    notes: ['Shown as 1.85×. N/A when no cash is invested.'],
    usedOn: ['pro-forma'],
    related: ['irr', 'total-net-profit'],
  },
  {
    id: 'irr',
    name: 'Internal rate of return',
    abbreviation: 'IRR',
    category: 'exit',
    definition:
      "The yearly return rate that makes the investment's cash flows add up to zero in today's money.",
    purpose:
      'Unlike a simple total, it accounts for when the money comes back.',
    formula: [
      'Flows: −cash invested in year 0, cash to investor each year, plus net sale proceeds in the last year',
      'IRR is the rate r where Σ flow_t ÷ (1 + r)^t = 0, found by bisection between −99% and 1000%',
    ],
    notes: [
      'Flows are year-end and annual. N/A if there is no root in that range or no cash invested.',
      'A tax-adjusted version, "IRR after tax", uses after-tax cash flow.',
    ],
    usedOn: ['pro-forma'],
    related: ['equity-multiple', 'cash-to-investor'],
    example: {
      inputs: '−$80,000, then $3,000, $3,000, $3,000, and $123,000 in year 4',
      result: 'IRR = 13.92%',
    },
  },
  {
    id: 'after-tax-returns',
    name: 'Pre-tax vs after-tax returns',
    aliases: ['after tax', 'pre-tax'],
    category: 'exit',
    definition:
      "Pre-tax returns ignore income tax; after-tax returns add each year's tax effect.",
    purpose:
      'Depreciation can lower taxable income, so after-tax figures can differ a lot.',
    formula: ['After-tax cash flow = cash to investor + tax effect'],
    notes: [
      'The after-tax view excludes tax due on the sale. Hidden when the tax inputs are invalid.',
    ],
    usedOn: ['pro-forma', 'wealth'],
    related: ['tax-effect', 'taxable-income'],
  },
];
