import { EXIT_ENTRIES } from './glossary-entries-exit';
import { FINANCING_ENTRIES } from './glossary-entries-financing';
import { LOAN_ENTRIES } from './glossary-entries-loan';
import { RENTAL_ENTRIES } from './glossary-entries-rental';
import { RETURNS_RULES_ENTRIES } from './glossary-entries-returns-rules';
import { SALE_TAX_ENTRIES } from './glossary-entries-sale-tax';
import { WEALTH_ENTRIES } from './glossary-entries-wealth';
import type { GlossaryEntry } from './glossary-types';

/** Every glossary term, in category order (spec 015). */
export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  ...LOAN_ENTRIES,
  ...RENTAL_ENTRIES,
  ...RETURNS_RULES_ENTRIES,
  ...FINANCING_ENTRIES,
  ...EXIT_ENTRIES,
  ...WEALTH_ENTRIES,
  ...SALE_TAX_ENTRIES,
];

/**
 * Glossary ids that info popovers link to (spec 015 US3). A test keeps this a subset of
 * GLOSSARY_ENTRIES.
 */
export const GLOSSARY_LINKED_IDS = [
  'cap-rate',
  'one-percent-rule',
  'fifty-percent-rule',
  'net-housing-cost',
  'dscr',
] as const;
