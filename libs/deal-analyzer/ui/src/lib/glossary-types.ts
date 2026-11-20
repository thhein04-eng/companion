export type GlossaryCategoryId =
  | 'loan'
  | 'rental'
  | 'returns'
  | 'rules'
  | 'financing'
  | 'exit'
  | 'wealth'
  | 'sale-tax';

export interface GlossaryCategory {
  id: GlossaryCategoryId;
  label: string;
  order: number;
}

export type GlossaryRouteId =
  | 'amortization'
  | 'deal-analyzer'
  | 'financing'
  | 'wealth'
  | 'pro-forma'
  | 'sale';

/** One term (spec 015 data-model). Static content shipped with the app. */
export interface GlossaryEntry {
  /** Kebab-case slug, unique; used as the URL hash. */
  id: string;
  name: string;
  abbreviation?: string;
  /** Extra search words. */
  aliases?: string[];
  category: GlossaryCategoryId;
  definition: string;
  purpose: string;
  /** One line per step; omitted for pure concepts. */
  formula?: string[];
  notes?: string[];
  usedOn: GlossaryRouteId[];
  related?: string[];
  /** Verified against the real calculations by glossary-entries.spec.ts. */
  example?: { inputs: string; result: string };
}

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  { id: 'loan', label: 'Loan', order: 1 },
  { id: 'rental', label: 'Rental income & expenses', order: 2 },
  { id: 'returns', label: 'Return metrics', order: 3 },
  { id: 'rules', label: 'Rules of thumb', order: 4 },
  { id: 'financing', label: 'Financing & DSCR', order: 5 },
  { id: 'exit', label: 'Hold & Exit', order: 6 },
  { id: 'wealth', label: 'Wealth', order: 7 },
  { id: 'sale-tax', label: 'Sale & tax', order: 8 },
];

/** Route labels and hrefs; must match apps/amortization-calculator/src/app/_nav.tsx. */
export const GLOSSARY_ROUTES: Record<
  GlossaryRouteId,
  { label: string; href: string }
> = {
  amortization: { label: 'Amortization Calculator', href: '/amortization' },
  'deal-analyzer': { label: 'Rental Deal Analyzer', href: '/deal-analyzer' },
  financing: { label: 'DSCR & Financing', href: '/financing' },
  wealth: { label: 'Wealth Projection', href: '/wealth' },
  'pro-forma': { label: 'Hold & Exit', href: '/pro-forma' },
  sale: { label: 'Sale Profit', href: '/sale' },
};
