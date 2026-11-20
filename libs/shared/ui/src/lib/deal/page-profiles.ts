import type { DealFieldKey } from 'shared-calculations';

/** The chips the Deal Strip can show (spec 010 data-model §C). `total` is read-only. */
export type DealChipKey =
  | 'homePrice'
  | 'downPayment'
  | 'principal'
  | 'annualInterestRatePct'
  | 'termMonths'
  | 'rental.grossMonthlyRent'
  | 'total';

/** Chip order when a page pins nothing: data-model §A order, then the total. */
export const DEFAULT_CHIP_ORDER: DealChipKey[] = [
  'homePrice',
  'downPayment',
  'principal',
  'annualInterestRatePct',
  'termMonths',
  'rental.grossMonthlyRent',
  'total',
];

export interface MissingRequirement {
  field: DealFieldKey;
  /** What the input unlocks: "+ Add rent to unlock {unlocks}". */
  unlocks: string;
}

export interface PageProfile {
  pageId:
    | 'amortization'
    | 'deal-analyzer'
    | 'financing'
    | 'wealth'
    | 'pro-forma'
    | 'sale'
    | 'sensitivity';
  /** Shown first, in this order, in accent style. */
  pinned: DealChipKey[];
  /** Shown last, de-emphasized, still editable. */
  muted: DealChipKey[];
  /** Missing-input chips (US3). */
  requires: MissingRequirement[];
}

/** The page's headline metric, previewed in chip popovers and the sheet (data-model §D). */
export interface Headline {
  label: string;
  value: number | null;
  naReason: string | null;
  format: (n: number) => string;
  betterWhen: 'higher' | 'lower';
}

/** One part of the total monthly payment (US4 payment bar). */
export interface PaymentPart {
  field: DealFieldKey | 'principalAndInterest';
  label: string;
  monthly: number;
}

export interface DealPayment {
  principalAndInterest: number;
  total: number;
  parts: PaymentPart[];
  pmiDropPeriod: number | null;
}

export const AMORTIZATION_PROFILE: PageProfile = {
  pageId: 'amortization',
  pinned: ['principal', 'annualInterestRatePct', 'termMonths', 'total'],
  muted: ['rental.grossMonthlyRent'],
  requires: [],
};

export const DEAL_ANALYZER_PROFILE: PageProfile = {
  pageId: 'deal-analyzer',
  pinned: ['homePrice', 'downPayment', 'rental.grossMonthlyRent', 'total'],
  muted: [],
  requires: [{ field: 'rental.grossMonthlyRent', unlocks: 'cash flow' }],
};

export const FINANCING_PROFILE: PageProfile = {
  pageId: 'financing',
  pinned: ['annualInterestRatePct', 'termMonths', 'rental.grossMonthlyRent'],
  muted: [],
  requires: [{ field: 'rental.grossMonthlyRent', unlocks: 'DSCR' }],
};

export const WEALTH_PROFILE: PageProfile = {
  pageId: 'wealth',
  pinned: ['homePrice', 'downPayment', 'rental.grossMonthlyRent'],
  muted: [],
  requires: [
    { field: 'homePrice', unlocks: 'equity' },
    { field: 'rental.grossMonthlyRent', unlocks: 'net worth' },
  ],
};

export const PRO_FORMA_PROFILE: PageProfile = {
  pageId: 'pro-forma',
  pinned: ['homePrice', 'rental.grossMonthlyRent', 'annualInterestRatePct'],
  muted: [],
  requires: [
    { field: 'homePrice', unlocks: 'sale price' },
    { field: 'rental.grossMonthlyRent', unlocks: 'IRR' },
  ],
};

/** Sale Profit & Exit Analyzer (spec 013). Rent is optional: a non-rental sale still works. */
export const SALE_PROFILE: PageProfile = {
  pageId: 'sale',
  pinned: ['homePrice', 'downPayment', 'annualInterestRatePct'],
  muted: [],
  requires: [{ field: 'homePrice', unlocks: 'sale price' }],
};

/** Sensitivity Matrix & Max Allowable Offer (spec 017). Needs price, down payment and rent. */
export const SENSITIVITY_PROFILE: PageProfile = {
  pageId: 'sensitivity',
  pinned: [
    'annualInterestRatePct',
    'homePrice',
    'downPayment',
    'rental.grossMonthlyRent',
  ],
  muted: [],
  requires: [
    { field: 'homePrice', unlocks: 'the grid' },
    { field: 'downPayment', unlocks: 'the grid' },
    { field: 'rental.grossMonthlyRent', unlocks: 'the grid' },
  ],
};

/**
 * Chip order (data-model §C): `pinned` in its listed order (which may include `total`), then
 * every other chip in §A order, then `muted`, then `total` last only if it isn't pinned.
 */
export function chipOrder(profile: PageProfile): DealChipKey[] {
  const rest = DEFAULT_CHIP_ORDER.filter(
    (k) =>
      k !== 'total' &&
      !profile.pinned.includes(k) &&
      !profile.muted.includes(k),
  );
  const tail: DealChipKey[] = profile.pinned.includes('total') ? [] : ['total'];
  return [...profile.pinned, ...rest, ...profile.muted, ...tail];
}
