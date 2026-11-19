import { describe, expect, it } from 'vitest';
import { filterGlossary } from './glossary-filter';
import type { GlossaryEntry } from './glossary-types';

const e = (
  p: Partial<GlossaryEntry> & { id: string; name: string },
): GlossaryEntry => ({
  category: 'loan',
  definition: '',
  purpose: '',
  usedOn: ['amortization'],
  ...p,
});

const ENTRIES = [
  e({
    id: 'coc',
    name: 'Cash-on-Cash return',
    abbreviation: 'CoC',
    category: 'returns',
  }),
  e({
    id: 'pi',
    name: 'Principal & interest',
    abbreviation: 'P&I',
    aliases: ['p and i'],
  }),
  e({
    id: 'noi',
    name: 'Net operating income',
    abbreviation: 'NOI',
    category: 'rental',
  }),
  e({
    id: 'cap',
    name: 'Cap rate',
    category: 'returns',
    definition: 'NOI divided by price.',
  }),
  e({ id: 'ltv', name: 'Loan-to-value', abbreviation: 'LTV' }),
];

const ids = (r: GlossaryEntry[]) => r.map((x) => x.id);

describe('filterGlossary', () => {
  it('returns everything by category order then name when empty', () => {
    expect(ids(filterGlossary(ENTRIES))).toEqual([
      'ltv',
      'pi',
      'noi',
      'cap',
      'coc',
    ]);
  });
  it('matches abbreviations and aliases case-insensitively', () => {
    expect(ids(filterGlossary(ENTRIES, { query: 'coc' }))).toEqual(['coc']);
    expect(ids(filterGlossary(ENTRIES, { query: 'P&I' }))).toEqual(['pi']);
    expect(ids(filterGlossary(ENTRIES, { query: 'p and i' }))).toEqual(['pi']);
  });
  it('ranks name/abbreviation hits before definition hits', () => {
    expect(ids(filterGlossary(ENTRIES, { query: 'noi' }))).toEqual([
      'noi',
      'cap',
    ]);
  });
  it('combines category and query with AND', () => {
    expect(
      ids(filterGlossary(ENTRIES, { query: 'noi', category: 'returns' })),
    ).toEqual(['cap']);
    expect(ids(filterGlossary(ENTRIES, { category: 'returns' }))).toEqual([
      'cap',
      'coc',
    ]);
  });
  it('returns nothing for no match', () => {
    expect(filterGlossary(ENTRIES, { query: 'zzz' })).toEqual([]);
  });
});
