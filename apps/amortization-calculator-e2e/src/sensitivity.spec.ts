import { expect, test, type Page } from '@playwright/test';
import { closeDealSheet, fillNumberField, skipSetupFor } from './helpers';

/**
 * Spec 015: the Sensitivity page. Uses spec 002's reference vector A ($250,000, 25% down, 7%,
 * $3,000 tax, $1,200 insurance, $2,400 rent): cash flow $250.56/mo, Cash-on-Cash 4.81%.
 */
async function enterReferenceDeal(page: Page, rent = '2400') {
  await page.goto('/sensitivity');
  await fillNumberField(page, 'Home price', '250000');
  await fillNumberField(page, 'Down payment', '25');
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Annual property tax', '3000');
  await fillNumberField(page, "Annual homeowner's insurance", '1200');
  await fillNumberField(page, 'Monthly rent', rent);
  await page.keyboard.press('Tab');
  await closeDealSheet(page);
}

const cell = (page: Page, row: number, col: number) =>
  page.locator(
    `[data-testid="sensitivity-cell"][data-row="${row}"][data-col="${col}"]`,
  );
const columnHeaders = (page: Page) =>
  page.getByTestId('sensitivity-column-header');
/** The column headers' text without the "≈ max offer" tag, which depends on the offer. */
const headerTexts = (page: Page) =>
  columnHeaders(page).evaluateAll((els) =>
    els.map((el) => (el.textContent ?? '').replace('≈ max offer', '')),
  );
const rowHeaders = (page: Page) => page.getByTestId('sensitivity-row-header');
const choose = (page: Page, group: string, option: string) =>
  page.getByTestId(group).getByRole('radio', { name: option }).click();

/** The last dollar amount in the Deal Analyzer's cash-flow row ("Pre-tax cash flow ▲ Positive $300.52"). */
const cashFlowOf = async (page: Page) => {
  const text = (await page.getByTestId('row-cash-flow').textContent()) ?? '';
  const amounts = text.match(/[−-]?\$[\d,]+(?:\.\d+)?/g);
  return num(amounts ? amounts[amounts.length - 1] : null);
};

/** "$1,208" or "−$1,208" or "4.8%" → a number. */
const num = (text: string | null) =>
  Number((text ?? '').replace('−', '-').replace(/[^0-9.-]/g, ''));

test.describe('Sensitivity grid (spec 015 US1)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  test('the ringed center cell is the deal as entered, equal to the Deal Analyzer', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    const center = cell(page, 2, 2);
    await expect(center).toHaveAttribute('data-state', 'current');
    await expect(center).toHaveText('$251');
    await expect(center).toHaveAttribute(
      'aria-label',
      /cash flow \$250\.56 per month, current deal/,
    );
    await expect(cell(page, 0, 0)).toBeVisible();
    await expect(page.getByTestId('sensitivity-cell')).toHaveCount(25);
    await expect(rowHeaders(page)).toHaveText([
      '6%',
      '6.5%',
      '7%',
      '7.5%',
      '8%',
    ]);
    await expect
      .poll(() => headerTexts(page))
      .toEqual([
        '−10%$225,000',
        '−5%$237,500',
        '0%$250,000',
        '+5%$262,500',
        '+10%$275,000',
      ]);
  });

  test('a higher price makes cells worse and a higher rent makes them better', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    const row = async () =>
      Promise.all(
        [0, 1, 2, 3, 4].map(async (c) =>
          num(await cell(page, 2, c).textContent()),
        ),
      );
    const byPrice = await row();
    expect(byPrice).toEqual([...byPrice].sort((a, b) => b - a)); // best at −10%, worst at +10%

    await choose(page, 'sensitivity-vary', 'Rent');
    await expect
      .poll(() => headerTexts(page))
      .toEqual([
        '−10%$2,160/mo',
        '−5%$2,280/mo',
        '0%$2,400/mo',
        '+5%$2,520/mo',
        '+10%$2,640/mo',
      ]);
    const byRent = await row();
    expect(byRent).toEqual([...byRent].sort((a, b) => a - b));
    // A higher rate worsens every column.
    const down = await Promise.all(
      [0, 1, 2, 3, 4].map(async (r) =>
        num(await cell(page, r, 2).textContent()),
      ),
    );
    expect(down).toEqual([...down].sort((a, b) => b - a));
  });

  test('Cash-on-Cash shows one decimal and the same center as the Deal Analyzer', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    await choose(page, 'sensitivity-measure', 'Cash-on-Cash');
    await expect(cell(page, 2, 2)).toHaveText('4.8%');
    await expect(cell(page, 2, 2)).toHaveAttribute(
      'aria-label',
      /Cash-on-Cash 4\.81%/,
    );
  });

  test('the step sizes widen the ranges and keep the ring on the current deal', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    await choose(page, 'sensitivity-rate-step', '1%');
    await choose(page, 'sensitivity-column-step', '10%');
    await expect(rowHeaders(page)).toHaveText(['5%', '6%', '7%', '8%', '9%']);
    await expect
      .poll(() => headerTexts(page))
      .toEqual([
        '−20%$200,000',
        '−10%$225,000',
        '0%$250,000',
        '+10%$275,000',
        '+20%$300,000',
      ]);
    await expect(cell(page, 2, 2)).toHaveAttribute('data-state', 'current');
    await choose(page, 'sensitivity-rate-step', '0.25%');
    await expect(rowHeaders(page)).toHaveText([
      '6.5%',
      '6.75%',
      '7%',
      '7.25%',
      '7.5%',
    ]);
  });

  test('rows never go below 0%: near zero the ring moves up the grid', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    await fillNumberField(page, 'Annual interest rate', '0.5');
    await page.keyboard.press('Tab');
    await closeDealSheet(page);
    await choose(page, 'sensitivity-rate-step', '1%');
    await expect(rowHeaders(page)).toHaveText([
      '0.5%',
      '1.5%',
      '2.5%',
      '3.5%',
      '4.5%',
    ]);
    await expect(cell(page, 0, 2)).toHaveAttribute('data-state', 'current');
  });

  test('editing the deal recomputes the grid immediately', async ({ page }) => {
    await enterReferenceDeal(page);
    await fillNumberField(page, 'Annual interest rate', '8');
    await page.keyboard.press('Tab');
    await closeDealSheet(page);
    await expect(rowHeaders(page)).toHaveText([
      '7%',
      '7.5%',
      '8%',
      '8.5%',
      '9%',
    ]);
    await expect(cell(page, 2, 2)).toHaveAttribute('data-state', 'current');
  });

  test('a negative cell shows a minus sign, a text cue and not only a color', async ({
    page,
  }) => {
    await enterReferenceDeal(page, '1500');
    const negatives = page.locator(
      '[data-testid="sensitivity-cell"][data-state="negative"]',
    );
    await expect(negatives.first()).toBeVisible();
    await expect(negatives.first()).toHaveText(/^−\$/);
    await expect(negatives.first()).toHaveAttribute('aria-label', /negative/);
  });

  test('no cell shows ▼ before a target is set', async ({ page }) => {
    await enterReferenceDeal(page);
    await expect(page.getByTestId('sensitivity-grid')).not.toContainText('▼');
    await expect(page.getByTestId('sensitivity-legend')).not.toContainText(
      'below your',
    );
  });

  test('all 25 cells fit at 390px with no sideways page scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterReferenceDeal(page);
    await expect(page.getByTestId('sensitivity-cell')).toHaveCount(25);
    const widths = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      cells: Array.from(
        document.querySelectorAll('[data-testid="sensitivity-cell"]'),
      ).map((el) => {
        const r = el.getBoundingClientRect();
        return [Math.round(r.left), Math.round(r.right)];
      }),
    }));
    expect(widths.page).toBeLessThanOrEqual(390);
    for (const [left, right] of widths.cells) {
      expect(left).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(390);
    }
  });

  test('is read cell by cell with the arrow keys, from one tab stop', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    const stops = page
      .getByTestId('sensitivity-grid')
      .locator('[tabindex="0"]');
    await expect(stops).toHaveCount(1);
    await cell(page, 0, 0).focus();
    await page.keyboard.press('ArrowRight');
    await expect(cell(page, 0, 1)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(cell(page, 1, 1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(cell(page, 1, 4)).toBeFocused();
    await page.keyboard.press('Control+Home');
    await expect(columnHeaders(page).first()).toBeFocused();
    await expect(stops).toHaveCount(1);
  });
});

/** "At the offer" / "At your price" values from the offer card. */
const figureOf = async (page: Page, label: string) =>
  num(
    await page
      .getByTestId('max-offer')
      .getByText(label, { exact: true })
      .locator('xpath=following-sibling::dd[1]')
      .textContent(),
  );
const offerPrice = async (page: Page) =>
  num(await page.getByTestId('max-offer-price').textContent());
const targetField = (page: Page) =>
  page.getByRole('textbox', { name: 'At least', exact: true });

async function setTarget(
  page: Page,
  measure: 'Cash-on-Cash' | 'Monthly cash flow',
  value: string,
) {
  await choose(page, 'target-measure', measure);
  const field = targetField(page);
  await field.click();
  await page.keyboard.press('ControlOrMeta+A');
  await field.pressSequentially(value);
  await page.keyboard.press('Tab');
}

test.describe('Max Allowable Offer (spec 015 US2)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  test('a $300/mo target gives an offer below the price, and "Use this price" sets it (undoable)', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    await expect(page.getByTestId('target-default')).toBeVisible();
    await setTarget(page, 'Monthly cash flow', '300');
    await expect(page.getByTestId('target-default')).toHaveCount(0);
    const price = await offerPrice(page);
    expect(price).toBeLessThan(250_000);
    expect(await figureOf(page, 'At the offer')).toBeGreaterThanOrEqual(300);
    expect(await figureOf(page, 'At your price')).toBe(250.56);

    await page.getByTestId('use-max-offer').click();
    await expect(page.getByTestId('max-offer-delta')).toContainText(
      'The same as your price',
    );
    await expect(
      page
        .getByRole('region', { name: 'Deal' })
        .locator('[data-chip="homePrice"]'),
    ).toContainText(`$${price.toLocaleString('en-US')}`);
    // The deal at the offer meets the target.
    await page.goto('/deal-analyzer');
    expect(await cashFlowOf(page)).toBeGreaterThanOrEqual(300);
    // $1 more does not.
    await fillNumberField(page, 'Home price', String(price + 1));
    await page.keyboard.press('Tab');
    await closeDealSheet(page);
    expect(await cashFlowOf(page)).toBeLessThan(300);
  });

  test('Undo restores the price after "Use this price"', async ({ page }) => {
    await enterReferenceDeal(page);
    await setTarget(page, 'Monthly cash flow', '300');
    await page.getByTestId('use-max-offer').click();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(
      page
        .getByRole('region', { name: 'Deal' })
        .locator('[data-chip="homePrice"]'),
    ).toContainText('$250,000');
  });

  test('an 8% Cash-on-Cash target gives an offer whose return is at least 8%', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    await setTarget(page, 'Cash-on-Cash', '8');
    expect(await offerPrice(page)).toBeLessThan(250_000);
    expect(await figureOf(page, 'At the offer')).toBeGreaterThanOrEqual(8);
  });

  test('says no price reaches a target the rent cannot support, with no number', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    await setTarget(page, 'Monthly cash flow', '5000');
    await expect(page.getByTestId('max-offer-unreachable')).toContainText(
      'No price reaches this target at this rent and rate',
    );
    await expect(page.getByTestId('max-offer-price')).toHaveCount(0);
    await expect(page.getByTestId('use-max-offer')).toHaveCount(0);
  });

  test('rejects a Cash-on-Cash target out of range with an inline error and no result', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    await setTarget(page, 'Cash-on-Cash', '1500');
    await expect(page.getByText('Use 0–1000%')).toBeVisible();
    await expect(page.getByTestId('max-offer-price')).toHaveCount(0);
  });

  test('says so when the price already meets an easy target, and still shows the higher price', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    await setTarget(page, 'Monthly cash flow', '100');
    await expect(page.getByTestId('max-offer-already')).toContainText(
      'Your price already meets this target.',
    );
    expect(await offerPrice(page)).toBeGreaterThan(250_000);
  });

  test('marks the cells below the target, names it in the legend, and tags the offer column', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    await expect(page.getByTestId('sensitivity-grid')).not.toContainText('▼');
    await setTarget(page, 'Monthly cash flow', '300');
    await expect(
      page
        .locator('[data-testid="sensitivity-cell"][data-state="below-target"]')
        .first(),
    ).toHaveText(/^▼/);
    await expect(page.getByTestId('sensitivity-legend')).toContainText(
      '▼ below your $300/mo cash flow target',
    );
    // The offer is about 4% below the price: inside the −10%…+10% columns.
    await expect(page.getByTestId('sensitivity-mao-line')).toContainText(
      'Max offer $',
    );
    await expect(page.getByTestId('sensitivity-mao-line')).toContainText(
      'from your price',
    );
    await expect(
      columnHeaders(page).filter({ hasText: '≈ max offer' }),
    ).toHaveCount(1);
  });

  test('changing the rate changes the offer', async ({ page }) => {
    await enterReferenceDeal(page);
    await setTarget(page, 'Monthly cash flow', '300');
    const before = await offerPrice(page);
    await fillNumberField(page, 'Annual interest rate', '8');
    await page.keyboard.press('Tab');
    await closeDealSheet(page);
    expect(await offerPrice(page)).toBeLessThan(before);
  });
});

test.describe('The Sensitivity page in the app (spec 015 US3)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  test('"Sensitivity" is in the side navigation after "Sale Profit" and opens the page', async ({
    page,
  }) => {
    await page.goto('/amortization');
    const nav = page.getByRole('navigation', { name: 'Primary' });
    const labels = await nav.getByRole('link').allTextContents();
    const sale = labels.findIndex((t) => t.includes('Sale Profit'));
    expect(sale).toBeGreaterThanOrEqual(0);
    expect(labels[sale + 1]).toContain('Sensitivity');
    await nav.getByRole('link', { name: 'Sensitivity' }).click();
    await expect(page).toHaveURL(/\/sensitivity$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Sensitivity & Max Offer' }),
    ).toBeVisible();
  });

  test('the deal card is above the title, with rate, price, down payment and rent emphasized', async ({
    page,
  }) => {
    await page.goto('/sensitivity');
    const strip = page.getByRole('region', { name: 'Deal' });
    const stripBox = await strip.boundingBox();
    const titleBox = await page.locator('#main-content h1').boundingBox();
    expect(stripBox?.y ?? 0).toBeLessThan(titleBox?.y ?? 0);
    for (const key of [
      'annualInterestRatePct',
      'homePrice',
      'downPayment',
      'rental.grossMonthlyRent',
    ]) {
      await expect(strip.locator(`[data-chip="${key}"]`)).toHaveAttribute(
        'data-tone',
        'pin',
      );
    }
  });

  test('with no rent it says so, with the deal card hint and no grid or offer', async ({
    page,
  }) => {
    await page.goto('/sensitivity');
    await fillNumberField(page, 'Home price', '250000');
    await fillNumberField(page, 'Down payment', '25');
    await page.keyboard.press('Tab');
    await closeDealSheet(page);
    await expect(page.getByTestId('sensitivity-na')).toContainText(
      'Add rent to see the sensitivity.',
    );
    await expect(
      page
        .getByRole('region', { name: 'Deal' })
        .locator('[data-missing="rental.grossMonthlyRent"]'),
    ).toContainText('+ Add rent to unlock the grid');
    await expect(page.getByTestId('sensitivity-grid')).toHaveCount(0);
    await expect(page.getByTestId('max-offer')).toHaveCount(0);
  });

  test('with no down payment it says so and offers the deal card hint', async ({
    page,
  }) => {
    await page.goto('/sensitivity');
    await fillNumberField(page, 'Home price', '250000');
    await fillNumberField(page, 'Monthly rent', '2400');
    await page.keyboard.press('Tab');
    await closeDealSheet(page);
    await expect(page.getByTestId('sensitivity-na')).toContainText(
      'Add a down payment to see the sensitivity.',
    );
    await expect(
      page
        .getByRole('region', { name: 'Deal' })
        .locator('[data-missing="downPayment"]'),
    ).toContainText('+ Add down payment to unlock the grid');
    await expect(page.getByTestId('sensitivity-grid')).toHaveCount(0);
  });

  test('an invalid loan says to fix the loan inputs', async ({ page }) => {
    await enterReferenceDeal(page);
    await fillNumberField(page, 'Loan amount', '0');
    await page.keyboard.press('Tab');
    await closeDealSheet(page);
    await expect(page.getByTestId('sensitivity-na')).toContainText(
      'Fix the loan inputs to see the sensitivity.',
    );
    await expect(page.getByTestId('sensitivity-grid')).toHaveCount(0);
  });

  test('switching scenario tabs changes the grid and the offer', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    await setTarget(page, 'Monthly cash flow', '300');
    const first = await offerPrice(page);
    await page
      .getByRole('button', { name: 'Add scenario', exact: true })
      .click();
    // The new scenario starts as a copy; give it a different rate.
    await fillNumberField(page, 'Annual interest rate', '8');
    await page.keyboard.press('Tab');
    await closeDealSheet(page);
    await expect(rowHeaders(page)).toHaveText([
      '7%',
      '7.5%',
      '8%',
      '8.5%',
      '9%',
    ]);
    expect(await offerPrice(page)).toBeLessThan(first);
    await page
      .getByRole('region', { name: 'Deal' })
      .getByRole('tab', { name: 'Scenario 1' })
      .click();
    await expect(rowHeaders(page)).toHaveText([
      '6%',
      '6.5%',
      '7%',
      '7.5%',
      '8%',
    ]);
    // Below the $300 target, so the cell carries the ▼ marker.
    await expect(cell(page, 2, 2)).toHaveText(/\$251$/);
    expect(await offerPrice(page)).toBe(first);
  });

  test('every control works by keyboard alone, in reading order', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    // Segmented controls with the arrow keys.
    const vary = page.getByTestId('sensitivity-vary');
    await vary.getByRole('radio', { name: 'Price' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(vary.getByRole('radio', { name: 'Rent' })).toBeChecked();
    await expect(columnHeaders(page).first()).toContainText('$2,160/mo');
    // From the last grid control, Tab reaches the grid (one stop), then the target controls.
    await page
      .getByTestId('sensitivity-column-step')
      .getByRole('radio', { name: '5%', exact: true })
      .focus();
    await page.keyboard.press('Tab');
    await expect(cell(page, 0, 0)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      page.getByTestId('target-measure').getByRole('radio', { checked: true }),
    ).toBeFocused();
    // The target starts on the grid's measure (Monthly cash flow); the arrow keys move it.
    await page.keyboard.press('ArrowLeft');
    await expect(
      page
        .getByTestId('target-measure')
        .getByRole('radio', { name: 'Cash-on-Cash' }),
    ).toBeChecked();
    await page.keyboard.press('ArrowRight');
    await expect(
      page
        .getByTestId('target-measure')
        .getByRole('radio', { name: 'Monthly cash flow' }),
    ).toBeChecked();
    // Tab on to the target field and type a target.
    await page.keyboard.press('Tab');
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('300');
    // "Use this price" works with Enter. It is focused directly: macOS WebKit doesn't Tab onto
    // plain buttons by default (a Safari setting), while Chromium and Firefox do.
    const use = page.getByTestId('use-max-offer');
    await page.keyboard.press('Tab'); // commits the typed target
    await use.focus();
    await expect(use).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('max-offer-delta')).toContainText(
      'The same as your price',
    );
  });
});
