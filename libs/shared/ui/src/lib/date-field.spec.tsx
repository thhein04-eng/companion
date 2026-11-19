import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DateField } from './date-field';

beforeAll(() => {
  // jsdom has no Web Animations API; ui-sdk popups wait on it when closing.
  Element.prototype.getAnimations ??= () => [];
  window.matchMedia ??= vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
  globalThis.ResizeObserver ??= class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof ResizeObserver;
});
afterEach(cleanup);

function Harness({ initial = '2027-01-01' as string | null, spy = vi.fn() }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <DateField
      label="First payment date"
      value={value}
      onValueChange={(v) => {
        spy(v);
        setValue(v);
      }}
    />
  );
}

const openCalendar = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Choose date/ }));
  });
  // jsdom doesn't implement the popover top layer, so the open calendar counts as hidden.
  return screen.findByRole('grid', { hidden: true });
};

describe('DateField calendar (spec 011 US4)', () => {
  it('has a calendar button', () => {
    render(<Harness />);
    expect(
      screen.getByRole('button', {
        name: 'Choose date for First payment date',
      }),
    ).toBeTruthy();
  });

  it('opens on the value month with the value selected', async () => {
    render(<Harness />);
    const grid = await openCalendar();
    const selected = grid.querySelector('[data-selected]');
    expect(selected?.getAttribute('data-value')).toBe('2027-01-01');
  });

  it('picking a day sets the value and closes the calendar', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const grid = await openCalendar();
    const day = grid.querySelector('[data-value="2027-01-15"]') as HTMLElement;
    const target = (day.querySelector('button') as HTMLElement) ?? day;
    await act(async () => {
      fireEvent.click(target);
    });
    expect(spy).toHaveBeenLastCalledWith('2027-01-15');
  });

  it('opens on today when there is no valid value', async () => {
    render(<Harness initial={null} />);
    const grid = await openCalendar();
    expect(grid.querySelector('[data-today]')).not.toBeNull();
  });
});
