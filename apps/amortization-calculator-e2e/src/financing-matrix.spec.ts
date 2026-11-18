import { expect, test, type Page } from '@playwright/test';
import { clearNumberField, fillNumberField } from './helpers';

/**
 * Spec 006 reference scenario (research.md § Reference scenario): $400k price,
 * 25% down, 7% / 30yr, $4,800/yr tax, $1,800/yr insurance, $3,800 rent with
 * the default 5/8/5/5% reserves. NOI = $2,376.00/mo.
 */
async function enterReferenceScenario(page: Page) {
  await page.goto('/financing');
  await fillNumberField(page, 'Home price', '400000');
  await fillNumberField(page, 'Down payment', '25');
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Annual property tax', '4800');
  await fillNumberField(page, "Annual homeowner's insurance", '1800');
  await fillNumberField(page, 'Monthly rent', '3800');
  await page.keyboard.press('Tab');
}

test.describe('DSCR & Financing page (spec 006)', () => {
  test('has its own route, title, heading and nav link', async ({ page }) => {
    await page.goto('/financing');
    await expect(page).toHaveTitle('DSCR & Financing · Companion');
    await expect(
      page.getByRole('heading', { level: 1, name: 'DSCR & Financing' }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('navigation', { name: 'Primary' })
        .getByRole('link', { name: 'DSCR & Financing' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('the Deal Analyzer no longer shows DSCR or the matrix; inputs are shared', async ({
    page,
  }) => {
    await enterReferenceScenario(page);
    await expect(page.getByTestId('dscr')).toBeVisible();

    await page.goto('/deal-analyzer');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Rental Deal Analyzer' }),
    ).toBeVisible();
    // Inputs entered on /financing are there on the Deal Analyzer…
    await expect(page.getByTestId('row-cash-flow')).toContainText('$380.09');
    // …but the DSCR card and financing matrix live only on /financing.
    await expect(page.getByTestId('dscr')).toHaveCount(0);
    await expect(page.getByTestId('financing-matrix')).toHaveCount(0);
    await expect(page.getByTestId('deal-metrics')).toBeVisible();
  });
});

test.describe('DSCR card (spec 006 US1)', () => {
  test('flags a DSCR below the minimum and follows the chosen minimum', async ({
    page,
  }) => {
    await enterReferenceScenario(page);

    const card = page.getByTestId('dscr');
    const status = page.getByTestId('dscr-status');
    await expect(card).toContainText('1.19×');
    await expect(status).toHaveAttribute('data-status', 'fail');
    await expect(status).toHaveText(/Below 1\.25× minimum/);
    await expect(page.getByTestId('dscr-rent-needed')).toContainText(
      '$3,954.40',
    );

    await card.getByRole('radio', { name: '1.15×' }).click();
    await expect(status).toHaveAttribute('data-status', 'pass');
    await expect(status).toHaveText(/Meets 1\.15× minimum/);
    await expect(page.getByTestId('dscr-rent-needed')).toHaveCount(0);

    // The minimum persists for the session (FR-013).
    await page.reload();
    await expect(page.getByTestId('dscr-status')).toHaveText(
      /Meets 1\.15× minimum/,
    );
  });

  test('says when NOI does not cover the debt and rejects an invalid minimum', async ({
    page,
  }) => {
    await enterReferenceScenario(page);

    await fillNumberField(page, 'Monthly rent', '2000');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('dscr')).toContainText(
      'NOI does not cover the annual principal & interest.',
    );

    await fillNumberField(page, 'Custom minimum', '2.5');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('dscr')).toContainText(
      'Minimum DSCR must be between 1.00 and 2.00.',
    );
    await expect(page.getByTestId('dscr-status')).toHaveAttribute(
      'data-status',
      'na',
    );
  });

  test('adds a DSCR column to the scenario comparison', async ({ page }) => {
    await enterReferenceScenario(page);
    await page.getByRole('button', { name: '+ Add scenario' }).click();
    await page
      .getByRole('button', { name: 'Remove rental analysis' })
      .click();

    const grid = page
      .getByText('Compare scenarios')
      .locator('..')
      .locator('table');
    await expect(grid.locator('thead')).toContainText('DSCR');
    await expect(grid.locator('tbody tr').nth(0)).toContainText('1.19×');
    await expect(grid.locator('tbody tr').nth(1)).toContainText('—');
  });
});

test.describe('Financing matrix (spec 006 US2)', () => {
  test('reproduces the reference table and matches the Deal Analyzer', async ({
    page,
  }) => {
    await enterReferenceScenario(page);
    const matrix = page.getByTestId('financing-matrix');
    const cell = (id: string) => matrix.getByTestId(id);

    await expect(cell('monthly-pi-conventional')).toHaveText('$1,995.91');
    await expect(cell('cash-flow-conventional')).toHaveText('$380.09');
    await expect(cell('dscr-conventional')).toContainText('1.19×');
    await expect(
      cell('dscr-conventional').locator('[data-status]'),
    ).toHaveAttribute('data-status', 'fail');
    await expect(cell('rent-needed-conventional')).toHaveText('$3,954.40/mo');

    await expect(cell('monthly-pi-arm-initial')).toContainText('$1,896.20');
    await expect(cell('cash-flow-arm-initial')).toContainText('$479.80');
    await expect(cell('dscr-arm-initial')).toContainText('1.25×');
    await expect(
      cell('dscr-arm-initial').locator('[data-status]'),
    ).toHaveAttribute('data-status', 'pass');
    await expect(cell('monthly-pi-arm-reset')).toContainText('$2,240.75');
    await expect(cell('cash-flow-arm-reset')).toContainText('$135.25');
    await expect(cell('dscr-arm-reset')).toContainText('1.06×');

    await expect(cell('monthly-pi-dscr')).toHaveText('$2,201.29');
    await expect(cell('cash-flow-dscr')).toHaveText('$174.71');
    await expect(cell('dscr-dscr')).toContainText('1.08×');

    // SC-005: the untouched conventional column equals the Deal Analyzer's cash flow.
    await page.getByRole('link', { name: 'Rental Deal Analyzer' }).first().click();
    await expect(page.getByTestId('row-cash-flow')).toContainText('$380.09');
  });

  test('the toggle selects a structure and shows its breakdown', async ({
    page,
  }) => {
    await enterReferenceScenario(page);
    const toggle = page.getByTestId('financing-toggle');
    await toggle.getByRole('radio', { name: 'Conventional' }).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    await expect(toggle.getByRole('radio', { name: 'DSCR loan' })).toBeChecked();
    await expect(page.getByTestId('financing-col-dscr')).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(page.getByTestId('financing-col-conventional')).not.toHaveAttribute(
      'aria-current',
    );
    await expect(page.getByTestId('financing-breakdown')).toContainText(
      'NOI $2,376.00 − P&I $2,201.29 − PMI $0.00 = Cash flow $174.71 /mo',
    );
  });

  test('derived terms follow the loan inputs; no price shows a message', async ({
    page,
  }) => {
    await enterReferenceScenario(page);
    await fillNumberField(page, 'Annual interest rate', '6');
    await page.keyboard.press('Tab');
    // 6% conventional, 5.5% ARM initial, 7% DSCR loan on $300,000.
    await expect(page.getByTestId('monthly-pi-conventional')).toHaveText(
      '$1,798.65',
    );
    await expect(page.getByTestId('monthly-pi-dscr')).toHaveText('$1,995.91');

    await clearNumberField(page, 'Home price');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('financing-matrix-na')).toHaveText(
      'Enter a purchase price to compare financing options.',
    );
  });

  test('charges PMI only on conventional and ARM above 80% LTV', async ({
    page,
  }) => {
    await enterReferenceScenario(page);
    await fillNumberField(page, 'Down payment', '10');
    await fillNumberField(page, 'PMI rate', '0.5');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('monthly-pmi-conventional')).toHaveText(
      '$150.00',
    );
    await expect(page.getByTestId('monthly-pmi-dscr')).toHaveText('$0.00');
  });

  test('shows only the selected structure at phone width', async ({ page }) => {
    await enterReferenceScenario(page);
    await page.setViewportSize({ width: 375, height: 800 });

    await expect(page.getByTestId('financing-narrow')).toBeVisible();
    await expect(page.getByTestId('narrow-cash-flow-conventional')).toHaveText(
      '$380.09',
    );
    await expect(page.getByTestId('cash-flow-conventional')).toBeHidden();
    // Poll: right after a resize the shell (docked nav → drawer) is still re-laying out.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      )
      .toBeLessThanOrEqual(0);
  });
});

test.describe('Editing financing terms (spec 006 US3)', () => {
  test('edits detach from the loan inputs, persist, and reset', async ({
    page,
  }) => {
    await enterReferenceScenario(page);
    const toggle = page.getByTestId('financing-toggle');

    await toggle.getByRole('radio', { name: 'DSCR loan' }).click();
    await fillNumberField(page, 'Down payment %', '20');
    await fillNumberField(page, 'Interest rate %', '7.5');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('loan-amount-dscr')).toHaveText(
      '$320,000.00',
    );
    await expect(page.getByTestId('monthly-pi-conventional')).toHaveText(
      '$1,995.91',
    );
    await expect(page.getByTestId('financing-reset')).toBeVisible();

    // Detached: the loan rate no longer drives the matrix.
    await fillNumberField(page, 'Annual interest rate', '6');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('monthly-pi-conventional')).toHaveText(
      '$1,995.91',
    );

    // An invalid ARM term blanks only the ARM column.
    await toggle.getByRole('radio', { name: 'ARM' }).click();
    await fillNumberField(page, 'Term (years)', '5');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('financing-terms-arm')).toContainText(
      'Fixed period must be shorter than the term.',
    );
    await expect(page.getByTestId('cash-flow-arm')).toHaveText('—');
    await expect(page.getByTestId('cash-flow-dscr')).not.toHaveText('—');
    await expect(page.getByTestId('dscr')).toBeVisible();

    await page.reload();
    await expect(
      page.getByTestId('financing-toggle').getByRole('radio', { name: 'ARM' }),
    ).toBeChecked();
    await expect(page.getByTestId('loan-amount-dscr')).toHaveText(
      '$320,000.00',
    );
    await expect(page.getByTestId('cash-flow-arm')).toHaveText('—');

    await page.getByTestId('financing-reset').click();
    await expect(page.getByTestId('financing-reset')).toHaveCount(0);
    // Defaults derive from the current (6%) loan again; the selection is kept.
    await expect(page.getByTestId('monthly-pi-conventional')).toHaveText(
      '$1,798.65',
    );
    await expect(page.getByTestId('loan-amount-dscr')).toHaveText(
      '$300,000.00',
    );
    await expect(
      page.getByTestId('financing-toggle').getByRole('radio', { name: 'ARM' }),
    ).toBeChecked();
  });

  test('a session saved before this feature loads with defaults', async ({
    page,
  }) => {
    await enterReferenceScenario(page);
    await page.getByTestId('dscr').getByRole('radio', { name: '1.15×' }).click();
    await page
      .getByTestId('financing-toggle')
      .getByRole('radio', { name: 'ARM' })
      .click();

    await page.evaluate(() => {
      const key = 'amortization:scenarios';
      const state = JSON.parse(window.sessionStorage.getItem(key) ?? '{}');
      for (const scenario of state.scenarios ?? []) {
        if (scenario.rental) {
          delete scenario.rental.dscrMinimum;
          delete scenario.rental.financing;
          delete scenario.rental.financingSelection;
        }
      }
      window.sessionStorage.setItem(key, JSON.stringify(state));
    });
    await page.reload();

    await expect(page.getByTestId('dscr-status')).toHaveText(
      /Below 1\.25× minimum/,
    );
    await expect(
      page
        .getByTestId('financing-toggle')
        .getByRole('radio', { name: 'Conventional' }),
    ).toBeChecked();
    await expect(page.getByTestId('cash-flow-conventional')).toHaveText(
      '$380.09',
    );
  });
});
