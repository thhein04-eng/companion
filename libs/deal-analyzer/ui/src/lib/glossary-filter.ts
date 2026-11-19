import {
  GLOSSARY_CATEGORIES,
  type GlossaryCategoryId,
  type GlossaryEntry,
} from './glossary-types';

export interface GlossaryFilter {
  query?: string;
  category?: GlossaryCategoryId | 'all';
}

/** Lowercase; "&" reads as "and"; punctuation becomes a space. */
export function normalizeGlossaryText(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9%.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const categoryOrder = (id: GlossaryCategoryId) =>
  GLOSSARY_CATEGORIES.find((c) => c.id === id)?.order ?? 99;

/**
 * Filters by category and query (name, abbreviation, aliases, definition). Name, abbreviation and
 * alias hits rank first; ties go by category order, then name.
 */
export function filterGlossary(
  entries: readonly GlossaryEntry[],
  { query = '', category = 'all' }: GlossaryFilter = {},
): GlossaryEntry[] {
  const q = normalizeGlossaryText(query);
  const rows: { entry: GlossaryEntry; rank: number }[] = [];
  for (const entry of entries) {
    if (category !== 'all' && entry.category !== category) continue;
    let rank = 0;
    if (q) {
      const keys = [
        entry.name,
        entry.abbreviation ?? '',
        ...(entry.aliases ?? []),
      ].map(normalizeGlossaryText);
      if (keys.some((k) => k.includes(q))) rank = 0;
      else if (normalizeGlossaryText(entry.definition).includes(q)) rank = 1;
      else continue;
    }
    rows.push({ entry, rank });
  }
  return rows
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        categoryOrder(a.entry.category) - categoryOrder(b.entry.category) ||
        a.entry.name.localeCompare(b.entry.name),
    )
    .map((r) => r.entry);
}
