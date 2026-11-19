import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GLOSSARY_CATEGORIES } from './glossary-types';
import { GLOSSARY_ENTRIES } from './glossary-entries';
import { GlossaryView } from './glossary-view';

beforeEach(() => {
  window.location.hash = '';
});
afterEach(cleanup);

describe('GlossaryView (spec 015 US1)', () => {
  it('renders every category and every entry exactly once', () => {
    render(<GlossaryView />);
    for (const c of GLOSSARY_CATEGORIES)
      expect(
        screen.getByRole('heading', { level: 2, name: c.label }),
      ).toBeTruthy();
    for (const e of GLOSSARY_ENTRIES)
      expect(document.querySelectorAll(`[id="${e.id}"]`)).toHaveLength(1);
    expect(screen.getByTestId('glossary-count').textContent).toBe(
      `${GLOSSARY_ENTRIES.length} terms`,
    );
  });

  it('shows definition, purpose and formula for DSCR', () => {
    render(<GlossaryView />);
    const dscr = screen.getByTestId('glossary-entry-dscr');
    expect(dscr.textContent).toContain('How many times');
    expect(dscr.textContent).toContain('Why it matters');
    expect(dscr.textContent).toContain(
      'DSCR = annual NOI ÷ annual principal & interest',
    );
    expect(dscr.textContent).toContain('PMI is excluded');
  });
});

describe('GlossaryView search, filter and deep links (spec 015 US2)', () => {
  it('filters by abbreviation and updates the status count', () => {
    render(<GlossaryView />);
    fireEvent.change(screen.getByLabelText('Search terms'), {
      target: { value: 'coc' },
    });
    expect(screen.getByTestId('glossary-entry-cash-on-cash')).toBeTruthy();
    expect(screen.queryByTestId('glossary-entry-dscr')).toBeNull();
    expect(screen.getByRole('status').textContent).toMatch(/^\d+ terms?$/);
  });

  it('shows an empty state with a working Clear search', () => {
    render(<GlossaryView />);
    fireEvent.change(screen.getByLabelText('Search terms'), {
      target: { value: 'zzz' },
    });
    expect(screen.getByRole('status').textContent).toBe('No terms match "zzz"');
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByTestId('glossary-count').textContent).toBe(
      `${GLOSSARY_ENTRIES.length} terms`,
    );
  });

  it('combines a category chip with the query', () => {
    render(<GlossaryView />);
    fireEvent.click(screen.getByRole('button', { name: 'Financing & DSCR' }));
    expect(
      screen
        .getByRole('button', { name: 'Financing & DSCR' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.queryByTestId('glossary-entry-noi')).toBeNull();
    fireEvent.change(screen.getByLabelText('Search terms'), {
      target: { value: 'min' },
    });
    const list = screen.getByTestId('glossary-entry-minimum-dscr');
    expect(within(list).getByRole('heading', { level: 3 }).textContent).toBe(
      'Minimum DSCR',
    );
  });

  it('highlights the entry for a #hash and clears a filter that hides it', async () => {
    window.location.hash = '#dscr';
    render(<GlossaryView />);
    const dscr = await screen.findByTestId('glossary-entry-dscr');
    expect(dscr.getAttribute('aria-current')).toBe('true');
    expect(dscr.getAttribute('data-highlighted')).toBe('true');

    fireEvent.change(screen.getByLabelText('Search terms'), {
      target: { value: 'zzz' },
    });
    window.location.hash = '#noi';
    fireEvent(window, new HashChangeEvent('hashchange'));
    const noi = await screen.findByTestId('glossary-entry-noi');
    expect(noi.getAttribute('aria-current')).toBe('true');
  });

  it('shows the full list with no highlight for an unknown hash', () => {
    window.location.hash = '#nope';
    render(<GlossaryView />);
    expect(screen.getByTestId('glossary-count').textContent).toBe(
      `${GLOSSARY_ENTRIES.length} terms`,
    );
    expect(document.querySelector('[data-highlighted]')).toBeNull();
  });
});
