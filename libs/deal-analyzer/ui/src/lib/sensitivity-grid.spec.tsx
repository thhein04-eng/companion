import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import {
  buildSensitivityGrid,
  type SensitivityMeasure,
  type SensitivityTarget,
} from 'deal-analyzer-calculations';
import {
  DEFAULT_RENTAL_ASSUMPTIONS,
  type LoanScenario,
} from 'shared-calculations';
import { afterEach, describe, expect, it } from 'vitest';
import { SensitivityGrid } from './sensitivity-grid';

afterEach(cleanup);

/** Spec 002's reference vector: $250,000, 25% down, 7% / 30yr, rent $2,400 (cash flow $250.56). */
function vectorA(over: Partial<LoanScenario> = {}, rent = 2_400): LoanScenario {
  return {
    id: 's',
    name: 'S',
    principal: 187_500,
    annualInterestRatePct: 7,
    termMonths: 360,
    startDate: '2027-01-01',
    paymentFrequency: 'monthly',
    homePrice: 250_000,
    downPayment: { percent: 25 },
    annualPropertyTax: 3_000,
    annualInsurance: 1_200,
    pmiAnnualRatePct: null,
    monthlyHoa: null,
    extraPayments: [],
    principalIsOverridden: false,
    rental: { ...DEFAULT_RENTAL_ASSUMPTIONS, grossMonthlyRent: rent },
    ...over,
  };
}

function renderGrid(
  s: LoanScenario,
  over: {
    measure?: SensitivityMeasure;
    columnVariable?: 'price' | 'rent';
    target?: SensitivityTarget;
    maxOfferPrice?: number | null;
  } = {},
) {
  const grid = buildSensitivityGrid(s, {
    columnVariable: over.columnVariable ?? 'price',
    rateStepPct: 0.5,
    columnStepPct: 5,
    target: over.target,
    maxOfferPrice: over.maxOfferPrice,
  });
  return render(
    <SensitivityGrid
      grid={grid}
      measure={over.measure ?? 'cashFlow'}
      data-testid="grid"
    />,
  );
}

const cells = () => screen.getAllByTestId('sensitivity-cell');
const cellAt = (row: number, col: number) =>
  cells().find(
    (c) =>
      c.getAttribute('data-row') === String(row) &&
      c.getAttribute('data-col') === String(col),
  ) as HTMLElement;

describe('SensitivityGrid (spec 017 contracts/ui.md)', () => {
  it('is a real grid with row and column headers and 25 cells', () => {
    renderGrid(vectorA());
    expect(screen.getByRole('grid')).toBeTruthy();
    expect(cells()).toHaveLength(25);
    expect(
      screen.getAllByTestId('sensitivity-row-header').map((h) => h.textContent),
    ).toEqual(['6%', '6.5%', '7%', '7.5%', '8%']);
    expect(
      screen
        .getAllByTestId('sensitivity-column-header')
        .map((h) => h.textContent),
    ).toEqual([
      '−10%$225,000',
      '−5%$237,500',
      '0%$250,000',
      '+5%$262,500',
      '+10%$275,000',
    ]);
    expect(screen.getByRole('grid').querySelector('caption')?.textContent).toBe(
      'Monthly cash flow by interest rate and price change',
    );
  });

  it('shows the current deal ringed, named, and equal to the Deal Analyzer', () => {
    renderGrid(vectorA());
    const center = cellAt(2, 2);
    expect(center.getAttribute('data-state')).toBe('current');
    expect(center.textContent).toBe('$251');
    expect(center.getAttribute('aria-label')).toBe(
      'Rate 7%, price change 0% ($250,000): cash flow $250.56 per month, current deal',
    );
  });

  it('shows rent columns with "/mo" amounts', () => {
    renderGrid(vectorA(), { columnVariable: 'rent' });
    expect(
      screen
        .getAllByTestId('sensitivity-column-header')
        .map((h) => h.textContent),
    ).toEqual([
      '−10%$2,160/mo',
      '−5%$2,280/mo',
      '0%$2,400/mo',
      '+5%$2,520/mo',
      '+10%$2,640/mo',
    ]);
  });

  it('shows Cash-on-Cash to one decimal, with the exact figure in the label', () => {
    renderGrid(vectorA(), { measure: 'cashOnCash' });
    const center = cellAt(2, 2);
    expect(center.textContent).toBe('4.8%');
    expect(center.getAttribute('aria-label')).toContain('Cash-on-Cash 4.81%');
  });

  it('marks a negative cell with a minus sign, not just a color', () => {
    renderGrid(vectorA({}, 1_500));
    const negatives = cells().filter(
      (c) => c.getAttribute('data-state') === 'negative',
    );
    expect(negatives.length).toBeGreaterThan(0);
    for (const c of negatives) {
      expect(c.textContent?.startsWith('−$')).toBe(true);
      expect(c.getAttribute('aria-label')).toContain('negative');
    }
  });

  it('marks cells below the target with ▼ and the words, and none before a target is set', () => {
    const s = vectorA();
    renderGrid(s);
    expect(cells().some((c) => c.textContent?.includes('▼'))).toBe(false);
    cleanup();
    renderGrid(s, { target: { measure: 'cashFlow', value: 300 } });
    const below = cells().filter(
      (c) => c.getAttribute('data-state') === 'below-target',
    );
    expect(below.length).toBeGreaterThan(0);
    for (const c of below) {
      expect(c.textContent?.startsWith('▼')).toBe(true);
      expect(c.getAttribute('aria-label')).toContain('below target');
    }
    // The current deal is also below $300, so its label says so even though its state is "current".
    expect(cellAt(2, 2).getAttribute('data-state')).toBe('current');
    expect(cellAt(2, 2).getAttribute('aria-label')).toContain('below target');
  });

  it('shows n/a with the reason when Cash-on-Cash is undefined', () => {
    renderGrid(vectorA({ downPayment: { amount: 0 } }), {
      measure: 'cashOnCash',
    });
    for (const c of cells()) {
      expect(c.textContent).toBe('n/a');
      expect(c.getAttribute('aria-label')).toContain(
        'Cash-on-Cash not available: No cash invested',
      );
    }
  });

  it('tints cells by size on a diverging scale and never colors the text', () => {
    renderGrid(vectorA());
    const tints = cells().map((c) => (c as HTMLElement).style.backgroundColor);
    expect(tints.every((t) => t === '' || t.includes('color-mix'))).toBe(true);
    // At least one cell is tinted with the good color.
    expect(
      cells().some((c) =>
        (c as HTMLElement).style.backgroundColor.includes('--good'),
      ),
    ).toBe(true);
    expect(
      cells().every(
        (c) =>
          !c.className.includes('text-good') &&
          !c.className.includes('text-bad'),
      ),
    ).toBe(true);
  });

  it('tags the nearest column header with "≈ max offer" when the offer is in range', () => {
    renderGrid(vectorA(), { maxOfferPrice: 231_500 });
    const headers = screen.getAllByTestId('sensitivity-column-header');
    expect(headers[1].textContent).toContain('≈ max offer');
    expect(
      headers.filter((h) => h.textContent?.includes('≈ max offer')),
    ).toHaveLength(1);
  });

  it('is read cell by cell with the arrow keys, with one tab stop', () => {
    renderGrid(vectorA());
    const stops = [
      ...screen.getAllByTestId('sensitivity-cell'),
      ...screen.getAllByTestId('sensitivity-row-header'),
      ...screen.getAllByTestId('sensitivity-column-header'),
    ].filter((el) => el.getAttribute('tabindex') === '0');
    expect(stops).toHaveLength(1);
    expect(stops[0]).toBe(cellAt(0, 0));
    cellAt(0, 0).focus();
    fireEvent.keyDown(cellAt(0, 0), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cellAt(0, 1));
    fireEvent.keyDown(cellAt(0, 1), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cellAt(1, 1));
    fireEvent.keyDown(cellAt(1, 1), { key: 'End' });
    expect(document.activeElement).toBe(cellAt(1, 4));
    fireEvent.keyDown(cellAt(1, 4), { key: 'ArrowUp' });
    fireEvent.keyDown(cellAt(0, 4), { key: 'ArrowUp' });
    expect(
      within(screen.getByRole('grid')).getAllByTestId(
        'sensitivity-column-header',
      ),
    ).toContain(document.activeElement);
  });
});
