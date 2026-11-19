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
    expect((input as HTMLInputElement).value).toBe('6.54');
    fireEvent.keyDown(input, { key: 'ArrowUp', shiftKey: true });
    expect((input as HTMLInputElement).value).toBe('6.64');
    for (let i = 0; i < 100; i++)
      fireEvent.keyDown(input, { key: 'ArrowDown', shiftKey: true });
    expect((input as HTMLInputElement).value).toBe('0');
  });

  it('has no scrub area without the prop', () => {
    const { container } = renderRate(false);
    expect(container.querySelector('[data-scrub-area]')).toBeNull();
  });
});

function Field({
  variant,
  step,
  min,
  max,
  initial,
}: {
  variant?: 'currency' | 'plain';
  step?: number;
  min?: number;
  max?: number;
  initial: number;
}) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <>
      <NumberField
        label="Amount"
        variant={variant}
        step={step}
        min={min}
        max={max}
        value={value}
        onValueChange={setValue}
      />
      <output data-testid="stored">{String(value)}</output>
    </>
  );
}

function typeAndCommit(text: string) {
  const input = screen.getByRole('textbox', { name: 'Amount' });
  act(() => input.focus());
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
  return input as HTMLInputElement;
}

describe('NumberField precision', () => {
  it('keeps a typed rate exactly instead of snapping it to the step', () => {
    render(<Field step={0.125} initial={6.5} />);
    const input = typeAndCommit('6.37');
    expect(screen.getByTestId('stored').textContent).toBe('6.37');
    expect(input.value).toBe('6.37');
  });

  it('keeps a typed rate with many decimals', () => {
    render(<Field step={0.01} initial={6.5} />);
    const input = typeAndCommit('6.4375');
    expect(screen.getByTestId('stored').textContent).toBe('6.4375');
    expect(input.value).toBe('6.4375');
  });

  it('keeps a typed currency amount, cents included, off a $1,000 step', () => {
    render(<Field variant="currency" step={1000} initial={450_000} />);
    const input = typeAndCommit('347,512.34');
    expect(screen.getByTestId('stored').textContent).toBe('347512.34');
    expect(input.value).toBe('$347,512.34');
  });

  it('still clamps a typed value to min and max', () => {
    render(<Field min={0} max={99} step={1} initial={20} />);
    typeAndCommit('150');
    expect(screen.getByTestId('stored').textContent).toBe('99');
  });
});
