import type { GlossaryEntry } from './glossary-types';

/** Sale Profit & Exit Analyzer terms. Mirrors analyze-sale.ts. All tax figures are planning estimates. */
export const SALE_TAX_ENTRIES: GlossaryEntry[] = [
  {
    id: 'exit-timing',
    name: 'Exit timing',
    aliases: ['sell after', 'exit month'],
    category: 'sale-tax',
    definition: 'The month you sell, entered in years or months.',
    purpose:
      'Profit changes with each month because of appreciation, loan paydown and cash flow.',
    notes: [
      'A whole number of months from 1 up to the loan term; longer values are clamped.',
      'Defaults to the hold period × 12 for a rental, otherwise 84 months.',
    ],
    usedOn: ['sale'],
    related: ['hold-period'],
  },
  {
    id: 'sale-return',
    name: 'Return on cash invested',
    category: 'sale-tax',
    definition: 'Total net profit as a percentage of the cash you invested.',
    purpose: 'It is a quick total return for the chosen exit month.',
    formula: ['Return = total net profit ÷ total cash invested'],
    notes: [
      'Not annualised, so it is not comparable to IRR. N/A when no cash is invested.',
    ],
    usedOn: ['sale'],
    related: ['total-net-profit', 'irr'],
  },
  {
    id: 'sale-verdict',
    name: 'Profit / Loss / Break-even',
    aliases: ['verdict'],
    category: 'sale-tax',
    definition: 'A label for the exit: Profit, Loss or Break-even.',
    purpose: 'It states the outcome at a glance.',
    formula: [
      'Profit if net profit (to the cent) > 0; Loss if < 0; Break-even if exactly 0',
    ],
    usedOn: ['sale'],
    related: ['total-net-profit'],
  },
  {
    id: 'break-even-price',
    name: 'Break-even sale price',
    aliases: ['breakeven'],
    category: 'sale-tax',
    definition: 'The lowest sale price at which total net profit is $0.',
    purpose: 'It tells you how much the price can fall before you lose money.',
    formula: [
      'Break-even = (remaining balance + total cash invested − cumulative cash flow) ÷ (1 − selling costs ÷ 100)',
      'If that is below 0, any price is profitable and it shows $0',
    ],
    usedOn: ['sale'],
    related: ['price-cushion', 'total-net-profit'],
    example: {
      inputs:
        '$250,000 home, 25% down, 3% a year, 7% costs, sold after 60 months (no rental)',
      result: 'Break-even price = $256,985.73',
    },
  },
  {
    id: 'price-cushion',
    name: 'Price cushion',
    category: 'sale-tax',
    definition:
      'How far the projected sale price is above (or below) the break-even price.',
    purpose: 'It shows your safety margin.',
    formula: ['Cushion = projected sale price − break-even sale price'],
    notes: ['A negative cushion is shown as "short of break-even".'],
    usedOn: ['sale'],
    related: ['break-even-price'],
  },
  {
    id: 'depreciation-taken',
    name: 'Depreciation taken',
    category: 'sale-tax',
    definition: 'The depreciation you have claimed up to the sale.',
    purpose: 'It lowers your tax basis and is partly taxed back at sale.',
    formula: [
      'Annual = depreciable basis ÷ 27.5;  taken = min(basis, annual × months ÷ 12)',
      'Depreciable basis = price × (1 − land share) + rehab budget',
    ],
    notes: ['0 for a non-rental.'],
    usedOn: ['sale'],
    related: ['depreciation', 'adjusted-basis'],
    example: {
      inputs:
        '$250,000 price, 20% land, $10,000 rehab, $7,500 closing, 3% a year, sold after 120 months',
      result: 'Depreciable basis $210,000; depreciation taken = $76,363.60',
    },
  },
  {
    id: 'adjusted-basis',
    name: 'Adjusted basis',
    category: 'sale-tax',
    definition:
      'Your cost in the property for tax purposes after depreciation.',
    purpose: 'Gain is measured against it.',
    formula: [
      'Adjusted basis = price + closing costs + rehab budget − depreciation taken',
    ],
    notes: ['Closing costs count here, though not in the depreciable basis.'],
    usedOn: ['sale'],
    related: ['depreciation-taken', 'taxable-gain'],
    example: {
      inputs:
        '$250,000 price, 20% land, $10,000 rehab, $7,500 closing, 3% a year, sold after 120 months',
      result: 'Adjusted basis = $191,136.40',
    },
  },
  {
    id: 'taxable-gain',
    name: 'Taxable gain',
    aliases: ['capital gain'],
    category: 'sale-tax',
    definition: 'The profit on the sale for tax purposes.',
    purpose: 'It is the amount taxed at sale.',
    formula: ['Taxable gain = sale price − selling costs − adjusted basis'],
    notes: [
      'A loss is shown as a negative gain with $0 tax; no loss benefit is modelled.',
    ],
    usedOn: ['sale'],
    related: ['adjusted-basis', 'depreciation-recapture', 'capital-gains-tax'],
    example: {
      inputs:
        '$250,000 price, 20% land, $10,000 rehab, $7,500 closing, 3% a year, sold after 120 months',
      result:
        '$335,979.09 sale − $23,518.54 costs − $191,136.40 basis = $121,324.15',
    },
  },
  {
    id: 'depreciation-recapture',
    name: 'Depreciation recapture tax',
    aliases: ['recapture', 'unrecaptured section 1250 gain'],
    category: 'sale-tax',
    definition:
      'Tax on the part of your gain that equals the depreciation you claimed.',
    purpose: 'It reduces the after-tax profit of a long hold.',
    formula: [
      'Recaptured gain = min(max(taxable gain, 0), depreciation taken)',
      'Recapture tax = recaptured gain × recapture rate',
    ],
    notes: ['Default rate 25%, allowed 0–40%.'],
    usedOn: ['sale'],
    related: ['depreciation-taken', 'taxable-gain'],
    example: {
      inputs:
        '$250,000 price, 20% land, $10,000 rehab, $7,500 closing, 3% a year, sold after 120 months',
      result: 'Recaptured gain $76,363.60 × 25% = $19,090.90',
    },
  },
  {
    id: 'capital-gains-tax',
    name: 'Capital gains tax',
    category: 'sale-tax',
    definition: 'Tax on the rest of the gain after the recaptured part.',
    purpose: 'It completes the after-tax profit estimate.',
    formula: [
      'Capital gain = max(0, taxable gain − recaptured gain)',
      'Capital gains tax = capital gain × capital gains rate',
    ],
    notes: [
      'Default rate 15%, allowed 0–40%.',
      'Sales within 12 months show a short-term warning; the model still uses the long-term rate.',
    ],
    usedOn: ['sale'],
    related: ['taxable-gain', 'depreciation-recapture'],
    example: {
      inputs:
        '$250,000 price, 20% land, $10,000 rehab, $7,500 closing, 3% a year, sold after 120 months',
      result: 'Capital gain $44,960.55 × 15% = $6,744.08',
    },
  },
  {
    id: 'after-tax-net-profit',
    name: 'After-tax net profit',
    category: 'sale-tax',
    definition: 'Total net profit minus the estimated taxes on the sale.',
    purpose: 'It shows what you keep after tax.',
    formula: [
      'After-tax net profit = total net profit − (recapture tax + capital gains tax)',
    ],
    notes: [
      'Off by default (toggle "Estimate taxes on sale"). An illustrative planning estimate, not tax advice.',
    ],
    usedOn: ['sale'],
    related: [
      'total-net-profit',
      'depreciation-recapture',
      'capital-gains-tax',
    ],
    example: {
      inputs:
        '$250,000 price, 20% land, $10,000 rehab, $7,500 closing, 3% a year, sold after 120 months',
      result: 'Total tax $25,834.98 → after-tax net profit = $75,794.55',
    },
  },
];
