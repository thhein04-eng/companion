import { createColorScheme, createLocalStorage } from '@ui-sdk/core';

/**
 * The app's System / Light / Dark choice (spec 010 FR-012, research R3). ui-sdk persists nothing
 * by default, so the choice is kept in `localStorage` (a display preference, not financial data).
 * When storage can't be written, ui-sdk keeps it in memory for the visit.
 */
export const colorScheme = createColorScheme({
  global: true,
  storage: createLocalStorage('companion.colorScheme'),
});
