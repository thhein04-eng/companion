import type { GlossaryEntry } from './glossary-types';

/** Wealth projection and tax terms. Mirrors project-wealth.ts. */
export const WEALTH_ENTRIES: GlossaryEntry[] = [
  {
    id: 'projection-horizon',
    name: 'Projection horizon',
    aliases: ['horizon'],
    category: 'wealth',
    definition: 'How many years the wealth projection runs.',
    purpose: 'It sets how far ahead equity and net worth are shown.',
    notes: ['Whole years from 1 to 30; default 10; presets 5 and 10.'],
    usedOn: ['wealth'],
  },
  {
    id: 'property-value',
    name: 'Property value',
    aliases: ['home value'],
    category: 'wealth',
    definition: 'The assumed market value of the property in each year.',
    purpose: 'It drives equity.',
    formula: [
      'Value in year N = (price + forced appreciation) × (1 + appreciation ÷ 100)^N',
    ],
    notes: ['Year 0 is the purchase: price + forced appreciation.'],
    usedOn: ['wealth', 'pro-forma'],
    related: ['appreciation', 'forced-appreciation', 'equity'],
  },
  {
    id: 'equity',
    name: 'Equity',
    aliases: ['home equity', 'equity build-up'],
    category: 'wealth',
    definition: 'The part of the property you own: its value minus the loan.',
    purpose: 'It is the main way wealth builds in a leveraged property.',
    formula: [
      'Equity = property value − loan balance',
      'Initial equity = price − loan;  principal paid = loan − balance',
      'Market appreciation = value − price − forced appreciation',
    ],
    notes: [
      'The equity chart needs a home price. Loan balance is 0 after the term.',
    ],
    usedOn: ['wealth'],
    related: ['property-value', 'remaining-balance'],
  },
  {
    id: 'appreciation',
    name: 'Appreciation',
    aliases: ['market appreciation'],
    category: 'wealth',
    definition:
      "The yearly percentage by which the property's value is assumed to rise.",
    purpose: 'It grows value and equity. Default 0%, so you opt in to growth.',
    notes: [
      'Allowed −10% to 25%. "Use typical rates" sets appreciation 3%, rent growth 2.5%, expense growth 2.5%.',
    ],
    usedOn: ['wealth', 'pro-forma', 'sale'],
    related: ['property-value', 'forced-appreciation'],
  },
  {
    id: 'forced-appreciation',
    name: 'Forced appreciation',
    aliases: ['arv', 'value added'],
    category: 'wealth',
    definition:
      'Value you add on purpose, for example through renovation (after-repair value − price).',
    purpose: 'It separates value you create from value the market adds.',
    notes: [
      'Dollar amount, 0 or more. Added to the price before appreciation compounds.',
    ],
    usedOn: ['wealth', 'pro-forma'],
    related: ['appreciation', 'property-value'],
  },
  {
    id: 'cumulative-cash-flow',
    name: 'Cumulative cash flow',
    category: 'wealth',
    definition: 'The running total of cash flow since purchase.',
    purpose: 'It adds the cash you collected along the way to your equity.',
    formula: ["Running sum of each year's pre-tax cash flow"],
    notes: [
      'On Wealth it ignores extra principal. On Hold & Exit and Sale Profit, extra principal is subtracted.',
      'After the loan term, cash flow equals NOI.',
    ],
    usedOn: ['wealth', 'pro-forma', 'sale'],
    related: ['cash-flow', 'net-worth'],
  },
  {
    id: 'net-worth',
    name: 'Net worth',
    category: 'wealth',
    definition:
      'Your wealth from this property: equity plus the cash flow collected.',
    purpose: 'It shows total progress, not just the loan paydown.',
    formula: [
      'Net worth = equity + cumulative cash flow',
      'After tax = net worth + cumulative tax effect',
    ],
    usedOn: ['wealth'],
    related: ['equity', 'cumulative-cash-flow', 'net-worth-multiple'],
  },
  {
    id: 'net-worth-multiple',
    name: 'Multiple on cash invested',
    category: 'wealth',
    definition: 'Final-year net worth divided by the cash you invested.',
    purpose:
      'It shows how many times your money grew by the end of the horizon.',
    formula: ['Multiple = net worth in the final year ÷ total cash invested'],
    notes: ['N/A when no cash is invested.'],
    usedOn: ['wealth'],
    related: ['net-worth', 'total-cash-invested'],
  },
  {
    id: 'depreciation',
    name: 'Depreciation',
    category: 'wealth',
    definition:
      'A tax deduction that spreads the cost of the building over 27.5 years (residential rental, straight line).',
    purpose: 'It lowers taxable income without costing cash.',
    formula: [
      'Depreciable basis = price × (1 − land share ÷ 100) + rehab budget',
      'Annual depreciation = basis ÷ 27.5, capped by the basis not yet depreciated',
    ],
    notes: [
      'Closing costs are not in the depreciable basis in the wealth model.',
    ],
    usedOn: ['wealth', 'pro-forma', 'sale'],
    related: ['land-share', 'taxable-income', 'depreciation-recapture'],
  },
  {
    id: 'land-share',
    name: 'Land value share',
    aliases: ['land share', 'land value'],
    category: 'wealth',
    definition:
      'The part of the price that is land, which cannot be depreciated.',
    purpose: 'Only the building is depreciated.',
    notes: [
      'Default 20%; must be 0 or more and below 100%. Shared by the Wealth, Hold & Exit and Sale Profit pages.',
    ],
    usedOn: ['wealth', 'pro-forma', 'sale'],
    related: ['depreciation'],
  },
  {
    id: 'marginal-tax-rate',
    name: 'Marginal tax rate',
    aliases: ['tax rate'],
    category: 'wealth',
    definition: 'The tax rate on your last dollar of income.',
    purpose: 'It converts taxable income into a tax effect.',
    notes: ['Default 24%, allowed 0–60%. A planning input, not tax advice.'],
    usedOn: ['wealth', 'pro-forma'],
    related: ['tax-effect'],
  },
  {
    id: 'annual-interest',
    name: 'Interest (annual)',
    category: 'wealth',
    definition: 'The loan interest paid during a year.',
    purpose: 'It is deducted when estimating taxable income.',
    formula: ["Sum of each payment's interest in that year (0 after payoff)"],
    usedOn: ['wealth', 'pro-forma'],
    related: ['taxable-income'],
  },
  {
    id: 'taxable-income',
    name: 'Taxable income',
    category: 'wealth',
    definition: 'The rental income the model treats as taxable for a year.',
    purpose: 'It is the base for the yearly tax effect.',
    formula: ['Taxable income = NOI − loan interest − depreciation'],
    notes: [
      'A simplification: closing costs are not deducted and passive-loss limits are ignored.',
    ],
    usedOn: ['wealth', 'pro-forma'],
    related: ['depreciation', 'annual-interest', 'tax-effect'],
  },
  {
    id: 'tax-effect',
    name: 'Tax effect',
    category: 'wealth',
    definition:
      'The estimated tax you pay (negative) or save (positive) from the property that year.',
    purpose: 'It adjusts cash flow and net worth for tax.',
    formula: ['Tax effect = −taxable income × marginal tax rate'],
    notes: [
      'A loss gives a positive tax effect. "Cumulative tax effect" is the running sum.',
    ],
    usedOn: ['wealth', 'pro-forma'],
    related: ['taxable-income', 'marginal-tax-rate'],
  },
];
