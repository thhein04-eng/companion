import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useState } from 'react';
import { DealEditsProvider, ScenariosProvider } from 'shared-data-access';
import { afterEach, describe, expect, it } from 'vitest';
import { NumberField } from './number-field';

function Rate({ scrub = true }: { scrub?: boolean }) {
  const [value, setValue] = useState<number | null>(6.5);
  return (
    <NumberField
      label="Annual interest rate"
      suffix="%"
      min={0}
      value={value}
      onValueChange={setValue}
      scrub={scrub ? { field: 'annualInterestRatePct' } : undefined}
    />
  );
}

function renderRate(scrub = true) {
  return render(
    <ScenariosProvider>
      <DealEditsProvider>
        <Rate scrub={scrub} />
      </DealEditsProvider>
    </ScenariosProvider>,
  );
}

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe('NumberField scrub (spec 010 US5)', () => {
  it('wraps the label in the ui-sdk scrub area and keeps the label on the input', () => {
    const { container } = renderRate();
    const area = container.querySelector('[data-scrub-area]');
    expect(area).not.toBeNull();
    expect(area?.textContent).toContain('Annual interest rate');
    expect(
      screen.getByRole('textbox', { name: 'Annual interest rate' }),
    ).toBeTruthy();
  });

  it('steps by the data-model step on arrow keys, ×10 with Shift, and clamps at min', () => {
    renderRate();
    const input = screen.getByRole('textbox', { name: 'Annual interest rate' });
    act(() => input.focus());
    for (let i = 0; i < 4; i++) fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect((input as HTMLInputElement).value).toBe('7');
    fireEvent.keyDown(input, { key: 'ArrowUp', shiftKey: true });
    expect((input as HTMLInputElement).value).toBe('8.25');
    for (let i = 0; i < 100; i++)
      fireEvent.keyDown(input, { key: 'ArrowDown', shiftKey: true });
    expect((input as HTMLInputElement).value).toBe('0');
  });

  it('has no scrub area without the prop', () => {
    const { container } = renderRate(false);
    expect(container.querySelector('[data-scrub-area]')).toBeNull();
  });
});
