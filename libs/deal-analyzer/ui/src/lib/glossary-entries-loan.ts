import type { GlossaryEntry } from './glossary-types';

/** Loan terms. Formulas mirror libs/shared/calculations (loan-math, compute-schedule, ltv). */
export const LOAN_ENTRIES: GlossaryEntry[] = [
  {
    id: 'principal-and-interest',
    name: 'Principal & interest',
    abbreviation: 'P&I',
    aliases: ['monthly payment', 'mortgage payment', 'p and i'],
    category: 'loan',
    definition:
      'The fixed part of a mortgage payment that repays the loan: some goes to interest, the rest reduces the balance.',
    purpose:
      'It is the debt payment the property must cover, and the base for DSCR, cash flow and the amortization schedule.',
    formula: [
      'i = annual rate ÷ 100 ÷ 12;  n = term in months',
      'P&I = loan × i × (1 + i)^n ÷ ((1 + i)^n − 1)',
      'At a 0% rate: P&I = loan ÷ n',
      'Each month: interest = balance × i; principal = P&I − interest',
    ],
    notes: [
      'The shown payment is rounded to cents; the last payment equals the remaining balance and can differ.',
      'Taxes, insurance, PMI and HOA are not part of P&I.',
    ],
    usedOn: ['amortization', 'deal-analyzer', 'financing'],
    related: ['total-monthly-payment', 'amortization-schedule', 'dscr'],
    example: {
      inputs: '$187,500 loan, 7%, 30 years',
      result: 'P&I = $1,247.44 per month',
    },
  },
  {
    id: 'amortization-schedule',
    name: 'Amortization schedule',
    aliases: ['amortization', 'payment schedule'],
    category: 'loan',
    definition:
      'A table of every payment showing how much goes to principal and interest and what balance remains afterwards.',
    purpose:
      'It shows how slowly equity builds early in a loan and how extra payments change the payoff.',
    formula: [
      'Interest for the period = remaining balance × monthly rate',
      'Scheduled principal = P&I − interest (never below 0)',
      'New balance = balance − scheduled principal − extra principal',
    ],
    notes: [
      'Each row is rounded to cents. Payment dates roll to the end of short months.',
      'The loan ends when the balance is paid off or on the last term payment.',
    ],
    usedOn: ['amortization'],
    related: ['principal-and-interest', 'remaining-balance', 'extra-payments'],
  },
  {
    id: 'remaining-balance',
    name: 'Remaining balance',
    aliases: ['loan balance', 'payoff balance'],
    category: 'loan',
    definition:
      'What you still owe on the loan after a given number of payments.',
    purpose:
      'It decides your equity and how much of a sale price goes to the lender.',
    formula: [
      'After k payments: balance = P(1 + i)^k − P&I × ((1 + i)^k − 1) ÷ i',
      'At a 0% rate: balance = P − P&I × k',
    ],
    notes: [
      'The schedule itself steps month by month; the closed form is used for ARM resets.',
    ],
    usedOn: ['amortization', 'pro-forma', 'wealth', 'sale'],
    related: ['loan-payoff', 'equity'],
    example: {
      inputs: '$187,500 loan, 7%, 30 years, after 60 payments',
      result: 'Balance = $176,496.73',
    },
  },
  {
    id: 'loan-term',
    name: 'Loan term',
    aliases: ['term', 'amortization period'],
    category: 'loan',
    definition:
      'How long the loan is scheduled to take to pay off, entered in years or months.',
    purpose:
      'A longer term lowers the payment but costs more interest in total.',
    notes: [
      'Stored internally in months. Projections past the term assume no debt.',
    ],
    usedOn: ['amortization', 'financing'],
  },
  {
    id: 'interest-rate',
    name: 'Annual interest rate',
    aliases: ['rate', 'note rate'],
    category: 'loan',
    definition:
      'The yearly interest rate on the loan, entered as a percentage.',
    purpose: 'It sets the interest part of every payment.',
    formula: ['Monthly rate = annual rate ÷ 100 ÷ 12'],
    notes: [
      'Cannot be negative. This app uses the note rate only; it does not calculate APR.',
    ],
    usedOn: ['amortization', 'financing'],
  },
  {
    id: 'loan-amount',
    name: 'Loan amount',
    aliases: ['principal', 'mortgage amount'],
    category: 'loan',
    definition: 'The amount borrowed.',
    purpose: 'It drives the payment, LTV and the cash you need at closing.',
    formula: ['Loan amount = home price − down payment'],
    notes: [
      'Calculated automatically from price and down payment; you can type over it.',
    ],
    usedOn: ['amortization', 'deal-analyzer', 'financing'],
    related: ['down-payment', 'ltv'],
  },
  {
    id: 'down-payment',
    name: 'Down payment',
    category: 'loan',
    definition: 'The part of the price you pay in cash instead of borrowing.',
    purpose:
      'A bigger down payment lowers the loan, the payment and PMI, but ties up more cash.',
    formula: ['As a percent: down payment = home price × percent ÷ 100'],
    notes: [
      'Enter dollars (at least 0 and below the price) or a percent (0 up to, not including, 100).',
      'It is the first part of total cash invested.',
    ],
    usedOn: ['amortization', 'deal-analyzer', 'financing', 'sale'],
    related: ['loan-amount', 'total-cash-invested'],
  },
  {
    id: 'home-price',
    name: 'Home price',
    aliases: ['purchase price', 'price'],
    category: 'loan',
    definition: 'What you pay for the property.',
    purpose:
      'Many metrics need it (LTV, cap rate, 1% Rule, equity, sale price); without it they show N/A.',
    usedOn: [
      'amortization',
      'deal-analyzer',
      'financing',
      'wealth',
      'pro-forma',
      'sale',
    ],
  },
  {
    id: 'ltv',
    name: 'Loan-to-value',
    abbreviation: 'LTV',
    category: 'loan',
    definition: 'The loan as a share of the property price.',
    purpose: 'Lenders price risk by it; 80% or below usually avoids PMI.',
    formula: ['LTV = loan amount ÷ home price'],
    notes: ['N/A when there is no home price.'],
    usedOn: ['amortization', 'deal-analyzer', 'financing'],
    related: ['pmi', 'loan-amount'],
    example: {
      inputs: '$187,500 loan on a $250,000 home',
      result: 'LTV = 75%',
    },
  },
  {
    id: 'pmi',
    name: 'Private mortgage insurance',
    abbreviation: 'PMI',
    category: 'loan',
    definition:
      'Insurance that protects the lender when your down payment is small. It is charged monthly until your balance falls far enough.',
    purpose: 'It adds to the payment and to debt service until it drops off.',
    formula: [
      'Monthly PMI = annual PMI rate ÷ 100 × original loan ÷ 12',
      'Applies while remaining balance ÷ home price is above 80% (strictly greater)',
    ],
    notes: [
      'Needs both a home price and a PMI rate. It drops automatically at the first payment where the test fails.',
      'The test uses the original price, not a new appraisal.',
      'The financing matrix applies PMI flat when LTV is above 80% and does not model the drop. A DSCR loan never carries PMI.',
    ],
    usedOn: ['amortization', 'deal-analyzer', 'financing'],
    related: ['ltv', 'debt-service'],
  },
  {
    id: 'property-tax',
    name: 'Property tax',
    category: 'loan',
    definition: 'The yearly tax charged by local government on the property.',
    purpose:
      'It is part of your monthly cost and is an operating expense for a rental.',
    formula: ['Monthly = annual property tax ÷ 12'],
    usedOn: ['amortization', 'deal-analyzer'],
    related: ['operating-expenses', 'total-monthly-payment'],
  },
  {
    id: 'insurance',
    name: "Homeowner's insurance",
    aliases: ['insurance'],
    category: 'loan',
    definition:
      'Yearly insurance covering damage and liability for the property.',
    purpose:
      'It is part of your monthly cost and is an operating expense for a rental.',
    formula: ['Monthly = annual insurance ÷ 12'],
    usedOn: ['amortization', 'deal-analyzer'],
    related: ['operating-expenses', 'total-monthly-payment'],
  },
  {
    id: 'hoa',
    name: 'Homeowners association fee',
    abbreviation: 'HOA',
    category: 'loan',
    definition:
      'A monthly fee paid to the association that maintains shared areas or services.',
    purpose:
      'It adds to your monthly cost and is an operating expense for a rental.',
    usedOn: ['amortization', 'deal-analyzer'],
    related: ['operating-expenses'],
  },
  {
    id: 'total-monthly-payment',
    name: 'Total monthly payment',
    aliases: ['piti', 'total estimated monthly payment'],
    category: 'loan',
    definition:
      'Everything you pay each month to own the home: loan, taxes, insurance, PMI and HOA.',
    purpose: 'It is the realistic monthly cost, not just the loan payment.',
    formula: [
      'Total = P&I + property tax ÷ 12 + insurance ÷ 12 + PMI (if it applies in month 1) + HOA',
    ],
    notes: [
      'Rounded to cents. The app does not model an escrow account separately.',
    ],
    usedOn: ['amortization'],
    related: ['principal-and-interest', 'pmi'],
  },
  {
    id: 'extra-payments',
    name: 'Extra payments',
    aliases: ['extra principal', 'prepayment'],
    category: 'loan',
    definition:
      'Money paid on top of the regular payment that goes straight to principal.',
    purpose:
      'They shorten the loan and cut interest; the page shows both savings.',
    formula: [
      'Recurring: applies every payment from a chosen payment number',
      'One-time: applies in the payment month containing the chosen date',
      'Periods saved = baseline payments − payments with extras',
      'Interest saved = baseline total interest − total interest with extras',
    ],
    notes: [
      'Each extra is capped by what is still owed. Extra principal is not part of debt service.',
    ],
    usedOn: ['amortization', 'pro-forma', 'sale'],
    related: ['total-interest', 'debt-service'],
  },
  {
    id: 'total-interest',
    name: 'Total interest',
    category: 'loan',
    definition: 'All the interest you pay over the life of the loan.',
    purpose:
      'It shows the real cost of borrowing and what extra payments save.',
    formula: ["Sum of each period's interest (each rounded to cents)"],
    usedOn: ['amortization'],
  },
  {
    id: 'total-cost',
    name: 'Total cost',
    category: 'loan',
    definition: 'The sum of all loan payments over the schedule.',
    purpose: 'It compares scenarios by what they cost in total.',
    formula: ['Total cost = sum of every payment (principal + interest)'],
    notes: ['Excludes taxes, insurance, PMI and HOA.'],
    usedOn: ['amortization'],
  },
  {
    id: 'payoff-date',
    name: 'Payoff date',
    category: 'loan',
    definition: 'The date of the last payment, when the loan reaches zero.',
    purpose: 'Extra payments move it earlier.',
    formula: ['Payoff date = date of the final scheduled payment'],
    usedOn: ['amortization'],
    related: ['extra-payments'],
  },
];
