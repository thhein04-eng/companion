import type { GlossaryEntry } from './glossary-types';

/** Financing & DSCR. Mirrors dscr.ts, financing.ts and financing-matrix.ts. */
export const FINANCING_ENTRIES: GlossaryEntry[] = [
  {
    id: 'dscr',
    name: 'Debt service coverage ratio',
    abbreviation: 'DSCR',
    aliases: ['debt service coverage'],
    category: 'financing',
    definition:
      "How many times the property's NOI covers its yearly loan payments.",
    purpose:
      'DSCR lenders qualify a loan on it; at 1.00 the NOI only just covers the payments.',
    formula: [
      'DSCR = annual NOI ÷ annual principal & interest',
      'Annual P&I = monthly P&I × 12',
    ],
    notes: [
      'PMI is excluded (P&I only), unlike "Debt service" on the deal page.',
      'N/A when there is no P&I. Meets the minimum when DSCR ≥ minimum; covers debt when DSCR ≥ 1.',
      'Shown as, for example, 1.25×.',
    ],
    usedOn: ['financing'],
    related: ['minimum-dscr', 'rent-for-dscr', 'noi', 'principal-and-interest'],
    example: {
      inputs: 'NOI $17,976/yr, P&I $1,247.44/mo',
      result: 'DSCR = 1.20×',
    },
  },
  {
    id: 'minimum-dscr',
    name: 'Minimum DSCR',
    aliases: ['dscr minimum', 'custom minimum'],
    category: 'financing',
    definition:
      'The lowest DSCR you want the deal to reach, usually what a lender requires.',
    purpose: 'It turns DSCR into a pass or fail.',
    notes: [
      'Default 1.25×; presets 1.15, 1.20 and 1.25; custom values must be between 1.00 and 2.00.',
      'An invalid stored value hides the pass/fail pill.',
    ],
    usedOn: ['financing'],
    related: ['dscr'],
  },
  {
    id: 'rent-for-dscr',
    name: 'Rent needed for the minimum DSCR',
    aliases: ['rent for minimum', 'rent for 1.25'],
    category: 'financing',
    definition:
      'The monthly rent at which the deal would just reach the minimum DSCR.',
    purpose: 'It tells you how far the current rent is from qualifying.',
    formula: [
      'Solve NOI = minimum × annual P&I for rent',
      'rent = ((minimum × annual P&I ÷ 12 + fixed costs) ÷ (1 − percentage cost share)) − other income',
    ],
    notes: [
      'Fixed costs: tax, insurance, HOA and custom expenses. Percentage share: vacancy, management, maintenance and CapEx.',
      'Never below $0. N/A when those percentages take 100% or more of rent.',
    ],
    usedOn: ['financing'],
    related: ['dscr', 'minimum-dscr'],
    example: {
      inputs: 'The reference deal at a 1.25× minimum',
      result: 'Rent needed = $2,479.61 per month',
    },
  },
  {
    id: 'conventional-loan',
    name: 'Conventional loan',
    aliases: ['30-yr fixed', 'fixed rate'],
    category: 'financing',
    definition:
      "A standard fixed-rate mortgage underwritten on the buyer's finances.",
    purpose: 'It is the baseline option in the financing comparison.',
    notes: [
      "Defaults: your scenario's down payment and rate, 30 years. PMI applies when LTV is above 80% and a PMI rate is set.",
    ],
    usedOn: ['financing'],
    related: ['arm', 'dscr-loan', 'financing-matrix'],
  },
  {
    id: 'arm',
    name: 'Adjustable-rate mortgage',
    abbreviation: 'ARM',
    aliases: ['7/1 arm', 'adjustable rate'],
    category: 'financing',
    definition:
      'A loan whose rate is fixed for an initial period, then resets. "7/1" means fixed for 7 years.',
    purpose:
      'A lower starting rate improves early cash flow, with risk after the reset.',
    formula: [
      'Phase 1: P&I at the initial rate over the full term',
      'Reset balance = remaining balance after the fixed months',
      'Phase 2: P&I = reset balance re-amortised at the adjusted rate over the remaining months',
    ],
    notes: [
      'Defaults: initial rate = rate − 0.5, adjusted rate = rate + 1.5, 7 years fixed. Fixed period must be 3, 5, 7 or 10 years and shorter than the term.',
      'The matrix shows "Initial" and "After reset" columns.',
    ],
    usedOn: ['financing'],
    related: ['conventional-loan', 'remaining-balance'],
    example: {
      inputs: '$187,500 loan, 7/1 ARM at 6.5% then 8.5%, 30 years',
      result: 'P&I $1,185.13 in years 1–7, $1,400.47 after the reset',
    },
  },
  {
    id: 'dscr-loan',
    name: 'DSCR loan',
    category: 'financing',
    definition:
      "An investor loan approved mainly on the property's DSCR instead of personal income.",
    purpose:
      'It lets you compare it with conventional and ARM options for the same deal.',
    notes: [
      'Defaults in this app: 25% down, rate = your rate + 1 point, 30 years, no PMI.',
    ],
    usedOn: ['financing'],
    related: ['dscr', 'conventional-loan'],
  },
  {
    id: 'financing-matrix',
    name: 'Financing options',
    aliases: ['loan comparison', 'financing matrix'],
    category: 'financing',
    definition:
      'A side-by-side table comparing Conventional, ARM and DSCR loan options for the same property.',
    purpose:
      'It shows which structure gives the best cash flow, cash-on-cash and DSCR.',
    formula: [
      'Loan = price × (1 − down % ÷ 100);  LTV = loan ÷ price',
      'Cash invested = down payment + closing costs + rehab',
      'Monthly cash flow = monthly NOI − P&I − PMI',
    ],
    notes: [
      'N/A with no purchase price. Warns "NOI doesn\'t cover P&I" when DSCR is below 1.',
    ],
    usedOn: ['financing'],
    related: ['conventional-loan', 'arm', 'dscr-loan'],
  },
];
