'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { PageHeader, Section, SectionHeader } from 'shared-ui';
import { GlossaryEntryCard } from './glossary-entry-card';
import { GLOSSARY_ENTRIES } from './glossary-entries';
import { filterGlossary } from './glossary-filter';
import { GLOSSARY_CATEGORIES, type GlossaryCategoryId } from './glossary-types';

type CategoryChoice = GlossaryCategoryId | 'all';

const chip = (active: boolean) =>
  `cursor-pointer rounded-full border px-3 py-1 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
    active
      ? 'border-accent bg-accent-soft font-medium text-fg'
      : 'border-line bg-surface text-muted hover:bg-sunk'
  }`;

/**
 * The Glossary & Formulas page (spec 015), rendered at `/glossary`. Static content: no scenario
 * data is read or stored. Search and category filter are local state; `#id` deep-links highlight
 * one entry.
 */
export function GlossaryView() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryChoice>('all');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const searchId = useId();

  const results = useMemo(
    () => filterGlossary(GLOSSARY_ENTRIES, { query, category }),
    [query, category],
  );

  // Deep link: on load and on hashchange, highlight the entry and clear a filter that hides it.
  const applyHash = useCallback(() => {
    const id = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (id && GLOSSARY_ENTRIES.some((e) => e.id === id)) {
      setQuery('');
      setCategory('all');
      setHighlightId(id);
    } else {
      setHighlightId(null);
    }
  }, []);

  useEffect(() => {
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [applyHash]);

  useEffect(() => {
    if (!highlightId) return;
    document
      .getElementById(highlightId)
      ?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
  }, [highlightId]);

  const clearSearch = () => {
    setQuery('');
    setCategory('all');
  };

  const total = results.length;
  const summary =
    total === 0
      ? `No terms match "${query.trim()}"`
      : `${total} ${total === 1 ? 'term' : 'terms'}`;

  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="Glossary & Formulas"
        lede="What each term means, why it matters, and how this app calculates it."
        note="Simplified models for planning, not tax or investment advice."
      />

      <Section>
        <div className="flex flex-col gap-3">
          <label htmlFor={searchId} className="text-[14px] font-medium text-fg">
            Search terms
          </label>
          <div className="flex gap-2">
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search, e.g. DSCR or cap rate"
              autoComplete="off"
              className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="h-10 cursor-pointer rounded-lg border border-line bg-surface px-3 text-[14px] text-fg hover:bg-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Clear
              </button>
            ) : null}
          </div>
          <div
            role="group"
            aria-label="Filter by category"
            className="flex flex-wrap gap-2"
          >
            <button
              type="button"
              aria-pressed={category === 'all'}
              className={chip(category === 'all')}
              onClick={() => setCategory('all')}
            >
              All
            </button>
            {GLOSSARY_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                className={chip(category === c.id)}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p
            role="status"
            data-testid="glossary-count"
            className="m-0 text-small text-muted"
          >
            {summary}
          </p>
        </div>
      </Section>

      {total === 0 ? (
        <Section>
          <div
            data-testid="glossary-empty"
            className="flex flex-col items-start gap-2 rounded-xl border border-line bg-surface p-[18px]"
          >
            <p className="m-0 text-fg">
              Try a different word, or an abbreviation such as NOI or LTV.
            </p>
            <button
              type="button"
              onClick={clearSearch}
              className="cursor-pointer rounded-lg border border-line bg-surface px-3 py-1.5 text-[14px] text-fg hover:bg-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Clear search
            </button>
          </div>
        </Section>
      ) : (
        GLOSSARY_CATEGORIES.map((c) => {
          const inCategory = results.filter((e) => e.category === c.id);
          if (inCategory.length === 0) return null;
          return (
            <Section key={c.id} aria-labelledby={`glossary-cat-${c.id}`}>
              <SectionHeader id={`glossary-cat-${c.id}`} title={c.label} />
              <div className="flex flex-col gap-4">
                {inCategory.map((e) => (
                  <GlossaryEntryCard
                    key={e.id}
                    entry={e}
                    highlighted={e.id === highlightId}
                  />
                ))}
              </div>
            </Section>
          );
        })
      )}
    </>
  );
}
