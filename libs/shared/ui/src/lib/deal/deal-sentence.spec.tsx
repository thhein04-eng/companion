import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { type ReactNode } from 'react';
import { DEFAULT_RENTAL_ASSUMPTIONS } from 'shared-calculations';
import {
  DealEditsProvider,
  ScenariosProvider,
  useScenarios,
} from 'shared-data-access';
import { afterEach, describe, expect, it } from 'vitest';
import { DealSentence } from './deal-sentence';

function Seed({
  children,
  rent = true,
}: {
  children: ReactNode;
  rent?: boolean;
}) {
  const { activeScenario, updateActiveScenario } = useScenarios();
  if (activeScenario.homePrice == null) {
    updateActiveScenario({
      homePrice: 450_000,
      downPayment: { percent: 20 },
      rental: rent
        ? { ...DEFAULT_RENTAL_ASSUMPTIONS, grossMonthlyRent: 3_200 }
        : null,
    });
    return null;
  }
  return <div>{children}</div>;
}

function renderSentence(rent = true) {
  return render(
    <ScenariosProvider>
      <DealEditsProvider>
        <Seed rent={rent}>
          <DealSentence />
        </Seed>
      </DealEditsProvider>
    </ScenariosProvider>,
  );
}

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe('DealSentence (spec 010 US4)', () => {
  it('reads the reference deal as a sentence', () => {
    renderSentence();
    expect(screen.getByTestId('deal-sentence').textContent).toBe(
      'Buying a $450,000 home with 20% down, so borrowing $360,000 at 6.5% for 30 years, renting it for $3,200/mo.',
    );
  });

  it('edits a value in place, committing on Enter', () => {
    renderSentence();
    fireEvent.click(screen.getByRole('button', { name: /Rate 6\.5%/ }));
    const input = screen.getByRole('textbox', { name: 'Rate' });
    act(() => {
      fireEvent.change(input, { target: { value: '6' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(screen.getByTestId('deal-sentence').textContent).toContain(
      'at 6% for',
    );
  });

  it('cancels with Escape', () => {
    renderSentence();
    fireEvent.click(screen.getByRole('button', { name: /Rate 6\.5%/ }));
    const input = screen.getByRole('textbox', { name: 'Rate' });
    act(() => {
      fireEvent.change(input, { target: { value: '9' } });
      fireEvent.keyDown(input, { key: 'Escape' });
    });
    expect(screen.getByTestId('deal-sentence').textContent).toContain(
      'at 6.5% for',
    );
  });

  it('shows a derived loan amount as text, not a control, and says why', () => {
    renderSentence();
    expect(screen.queryByRole('button', { name: /\$360,000/ })).toBeNull();
    expect(screen.getByText('$360,000').getAttribute('aria-description')).toBe(
      'Calculated from home price and down payment',
    );
  });

  it('asks for rent when there is none', () => {
    renderSentence(false);
    expect(screen.getByTestId('deal-sentence').textContent).toMatch(
      /renting it for add rent\.$/,
    );
    expect(screen.getByRole('button', { name: /add rent/ })).toBeTruthy();
  });
});
