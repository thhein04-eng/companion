import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useGridNavigation } from './use-grid-navigation';

/** A 4 × 4 grid: row 0 and column 0 are headers, (0, 0) is the empty corner. */
function Grid() {
  const { cellProps } = useGridNavigation(4, 4);
  return (
    <div role="grid" aria-label="test grid">
      {[0, 1, 2, 3].map((r) => (
        <div role="row" key={r}>
          {[0, 1, 2, 3].map((c) => (
            <div
              key={c}
              role={r === 0 || c === 0 ? 'columnheader' : 'gridcell'}
              data-testid={`c${r}${c}`}
              {...cellProps(r, c)}
            >
              {r},{c}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

afterEach(cleanup);

const cell = (r: number, c: number) => screen.getByTestId(`c${r}${c}`);
const press = (
  el: HTMLElement,
  key: string,
  opts: { ctrlKey?: boolean } = {},
) => {
  el.focus();
  fireEvent.keyDown(el, { key, ...opts });
};

describe('useGridNavigation (spec 017 research R9)', () => {
  it('puts exactly one cell in the tab order: the first data cell', () => {
    render(<Grid />);
    const stops = screen
      .getAllByText(/\d,\d/)
      .filter((el) => el.getAttribute('tabindex') === '0');
    expect(stops).toHaveLength(1);
    expect(stops[0]).toBe(cell(1, 1));
  });

  it('moves one cell with the arrow keys and stops at the edges', () => {
    render(<Grid />);
    press(cell(1, 1), 'ArrowRight');
    expect(cell(1, 2)).toBe(document.activeElement);
    press(cell(1, 2), 'ArrowDown');
    expect(cell(2, 2)).toBe(document.activeElement);
    press(cell(2, 2), 'ArrowLeft');
    expect(cell(2, 1)).toBe(document.activeElement);
    press(cell(2, 1), 'ArrowUp');
    expect(cell(1, 1)).toBe(document.activeElement);
    press(cell(3, 3), 'ArrowRight');
    expect(cell(3, 3)).toBe(document.activeElement);
    press(cell(3, 3), 'ArrowDown');
    expect(cell(3, 3)).toBe(document.activeElement);
  });

  it('includes the header cells, but never the empty corner', () => {
    render(<Grid />);
    press(cell(1, 1), 'ArrowUp');
    expect(cell(0, 1)).toBe(document.activeElement); // a column header
    press(cell(0, 1), 'ArrowLeft'); // the corner: stays put
    expect(cell(0, 1)).toBe(document.activeElement);
    press(cell(1, 1), 'ArrowLeft');
    expect(cell(1, 0)).toBe(document.activeElement); // a row header
    press(cell(1, 0), 'ArrowUp');
    expect(cell(1, 0)).toBe(document.activeElement);
  });

  it('jumps to the row ends with Home and End, and to the corners with Ctrl+Home/End', () => {
    render(<Grid />);
    press(cell(2, 2), 'End');
    expect(cell(2, 3)).toBe(document.activeElement);
    press(cell(2, 3), 'Home');
    expect(cell(2, 0)).toBe(document.activeElement);
    press(cell(0, 2), 'Home'); // the header row's first navigable cell, not the corner
    expect(cell(0, 1)).toBe(document.activeElement);
    press(cell(2, 2), 'End', { ctrlKey: true });
    expect(cell(3, 3)).toBe(document.activeElement);
    press(cell(2, 2), 'Home', { ctrlKey: true });
    expect(cell(0, 1)).toBe(document.activeElement);
  });

  it('keeps the last focused cell as the tab stop', () => {
    render(<Grid />);
    press(cell(1, 1), 'ArrowDown');
    press(cell(2, 1), 'ArrowRight');
    expect(cell(2, 2).getAttribute('tabindex')).toBe('0');
    expect(cell(1, 1).getAttribute('tabindex')).toBe('-1');
    act(() => cell(3, 1).focus()); // by mouse or screen reader
    expect(cell(3, 1).getAttribute('tabindex')).toBe('0');
    expect(cell(2, 2).getAttribute('tabindex')).toBe('-1');
  });

  it('leaves other keys alone', () => {
    render(<Grid />);
    const event = new KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
      cancelable: true,
    });
    cell(1, 1).focus();
    cell(1, 1).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    const arrow = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    cell(1, 1).dispatchEvent(arrow);
    expect(arrow.defaultPrevented).toBe(true);
  });
});
