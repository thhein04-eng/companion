'use client';

import { useCallback, useRef, useState, type KeyboardEvent } from 'react';

/** The props to spread on every cell of the grid (header cells included). */
export interface GridCellProps {
  ref: (el: HTMLElement | null) => void;
  tabIndex: 0 | -1;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * Cell-by-cell keyboard reading for a read-only data grid (WAI-ARIA grid pattern; spec 017
 * research R9). `@ui-sdk` has no grid primitive, so this small hook keeps one cell in the tab
 * order (a roving tabindex) and moves focus with:
 *
 * - the arrow keys: one cell, stopping at the edges;
 * - Home / End: the row's first and last cell;
 * - Ctrl+Home / Ctrl+End: the grid's first and last cell.
 *
 * `rowCount` × `columnCount` include the header row and the header column; the empty corner cell
 * (0, 0) is never a stop. The initial tab stop is the first data cell, (1, 1).
 */
export function useGridNavigation(rowCount: number, columnCount: number) {
  const [active, setActive] = useState({ row: 1, col: 1 });
  const cells = useRef(new Map<string, HTMLElement>());

  const focusCell = useCallback((row: number, col: number) => {
    cells.current.get(`${row}:${col}`)?.focus();
  }, []);

  /** Moves to (row, col) if it is a real stop; the corner is skipped by landing next to it. */
  const moveTo = useCallback(
    (row: number, col: number, from: { row: number; col: number }) => {
      const r = Math.min(Math.max(row, 0), rowCount - 1);
      const c = Math.min(Math.max(col, 0), columnCount - 1);
      if (r === 0 && c === 0) {
        // Home on the header row lands on its first column header; anything else stays put.
        if (from.row === 0 && col <= 0 && row === from.row && from.col !== 0)
          focusCell(0, 1);
        return;
      }
      focusCell(r, c);
    },
    [rowCount, columnCount, focusCell],
  );

  const cellProps = useCallback(
    (row: number, col: number): GridCellProps => ({
      ref: (el) => {
        const key = `${row}:${col}`;
        if (el) cells.current.set(key, el);
        else cells.current.delete(key);
      },
      tabIndex: row === active.row && col === active.col ? 0 : -1,
      onFocus: () => setActive({ row, col }),
      onKeyDown: (event) => {
        const from = { row, col };
        let handled = true;
        switch (event.key) {
          case 'ArrowRight':
            moveTo(row, col + 1, from);
            break;
          case 'ArrowLeft':
            moveTo(row, col - 1, from);
            break;
          case 'ArrowDown':
            moveTo(row + 1, col, from);
            break;
          case 'ArrowUp':
            moveTo(row - 1, col, from);
            break;
          case 'Home':
            if (event.ctrlKey) focusCell(0, 1);
            else moveTo(row, 0, from);
            break;
          case 'End':
            if (event.ctrlKey) focusCell(rowCount - 1, columnCount - 1);
            else moveTo(row, columnCount - 1, from);
            break;
          default:
            handled = false;
        }
        if (handled) event.preventDefault();
      },
    }),
    [active, moveTo, focusCell, rowCount, columnCount],
  );

  return { cellProps, active };
}
