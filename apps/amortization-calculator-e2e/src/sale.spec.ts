import { expect, test, type Page } from '@playwright/test';
import { fillNumberField, skipSetupFor } from './helpers';

/**
 * Spec 013 reference: the spec 006/009 property ($400k, 25% down, 7% / 30 yr, tax $4,800,
 * insurance $1,800, rent $3,800) with growth 3 / 2.5 / 3.5 and 7% selling costs.
 * Growth is set on /sale itself (shared fields).
 */
async function enterReference(page: Page) {
  await page.goto('/sale');
  await fillNumberField(page, 'Home price', '400000');
  await fillNumberField(page, 'Down payment', '25');
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Annual property tax', '4800');
  await fillNumberField(page, "Annual homeowner's insurance", '1800');
  await fillNumberField(page, 'Monthly rent', '3800');
  await fillNumberField(page, 'Rent growth', '3');
  await fillNumberField(page, 'Expense growth', '2.5');
  await fillNumberField(page, 'Appreciation', '3.5');
  await page.keyboard.press('Tab');
}

async function sellAfter(page: Page, value: string) {
  await fillNumberField(page, 'Sell after', value);
  await page.keyboard.press('Tab');
}

const row = (page: Page, id: string) => page.getByTestId(id).locator('td');

test.beforeEach(async ({ page }) => {
  await skipSetupFor(page);
});

test.describe('Sale Profit & Exit Analyzer (spec 013 US1)', () => {
  test('1: has its own route, title, heading and nav link', async ({ page }) => {
    await page.goto('/amortization');
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Sale Profit' })
      .click();
    await expect(page).toHaveURL(/\/sale$/);
    await expect(page).toHaveTitle('Sale Profit & Exit Analyzer · Companion');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Sale Profit & Exit Analyzer',
      }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('navigation', { name: 'Primary' })
        .getByRole('link', { name: 'Sale Profit' }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('region', { name: 'Deal' })).toBeVisible();
  });

  test('2: reproduces the reference sale at 7 years and agrees with Hold & Exit', async ({
    page,
  }) => {
    await enterReference(page);
    await expect(page.getByTestId('sale-summary')).toContainText(
      'Sale after 7 years',
    );
    await expect(row(page, 'sale-price')).toHaveText('$508,911.71');
    await expect(row(page, 'sale-selling-costs')).toHaveText('−$35,623.82');
    await expect(row(page, 'sale-balance')).toHaveText('−$273,442.24');
    await expect(row(page, 'sale-net-proceeds')).toHaveText('$199,845.65');
    await expect(row(page, 'sale-cash-flow')).toHaveText('$51,574.90');
    await expect(row(page, 'sale-invested')).toHaveText('−$100,000.00');
    await expect(row(page, 'sale-profit')).toHaveText('$151,420.55');
    await expect(row(page, 'sale-return')).toHaveText('151.42%');
    await expect(page.getByTestId('sale-verdict')).toHaveText('Profit');

    await page.getByRole('link', { name: /Hold & Exit →/ }).click();
    await expect(page).toHaveURL(/\/pro-forma$/);
    await expect(page.getByTestId('exit-profit')).toContainText('$151,420.55');
  });

  test('3: sells by the month and converts back to years', async ({ page }) => {
    await enterReference(page);
    await page
      .getByTestId('sale-exit-unit')
      .getByRole('radio', { name: 'Months' })
      .click();
    await expect(
      page.getByRole('textbox', { name: 'Sell after', exact: true }),
    ).toHaveValue('84');
    await sellAfter(page, '90');
    await expect(row(page, 'sale-price')).toHaveText('$517,741.07');
    await expect(row(page, 'sale-net-proceeds')).toHaveText('$210,497.27');
    await expect(row(page, 'sale-cash-flow')).toHaveText('$57,268.44');
    await expect(row(page, 'sale-profit')).toHaveText('$167,765.71');
    await expect(page.getByTestId('sale-summary')).toContainText(
      'Sale after 90 months',
    );
    await page
      .getByTestId('sale-exit-unit')
      .getByRole('radio', { name: 'Years' })
      .click();
    await expect(
      page.getByRole('textbox', { name: 'Sell after', exact: true }),
    ).toHaveValue('7.5');
    await expect(page.getByTestId('sale-summary')).toContainText(
      'Sale after 7 yr 6 mo',
    );
  });

  test('keeps the sale inputs across a reload (sessionStorage)', async ({
    page,
  }) => {
    await enterReference(page);
    await page
      .getByTestId('sale-exit-unit')
      .getByRole('radio', { name: 'Months' })
      .click();
    await sellAfter(page, '90');
    await page
      .getByTestId('sale-tax-toggle')
      .getByRole('radio', { name: 'On' })
      .click();
    await page.reload();
    await expect(
      page.getByRole('textbox', { name: 'Sell after', exact: true }),
    ).toHaveValue('90');
    await expect(row(page, 'sale-profit')).toHaveText('$167,765.71');
    await expect(page.getByTestId('sale-tax')).toBeVisible();
  });

  test('clamps an exit past the loan term with a note', async ({ page }) => {
    await enterReference(page);
    await page
      .getByTestId('sale-exit-unit')
      .getByRole('radio', { name: 'Months' })
      .click();
    await sellAfter(page, '400');
    await expect(page.getByTestId('sale-exit-clamped')).toHaveText(
      'Sale moved to month 360, the end of the loan term.',
    );
    await expect(row(page, 'sale-balance')).toHaveText('$0.00');
  });

  test('5: a non-rental sale has no cash flow', async ({ page }) => {
    await page.goto('/sale');
    await expect(page.getByTestId('sale-na')).toHaveText(
      'Enter a purchase price to model a sale.',
    );
    await fillNumberField(page, 'Home price', '400000');
    await fillNumberField(page, 'Down payment', '25');
    await fillNumberField(page, 'Annual interest rate', '7');
    await fillNumberField(page, 'Appreciation', '3.5');
    await page.keyboard.press('Tab');
    await expect(row(page, 'sale-cash-flow')).toHaveText('$0.00');
    await expect(page.getByTestId('sale-cash-flow')).toContainText(
      'No rental: cash flow not included',
    );
    await expect(row(page, 'sale-profit')).toHaveText('$99,845.65');
    await expect(page.getByTestId('sale-summary')).toContainText(
      'Excludes holding costs',
    );
    // No rental: no growth inputs.
    await expect(
      page.getByRole('textbox', { name: 'Rent growth', exact: true }),
    ).toHaveCount(0);
    await expect(page.getByTestId('sale-break-even-price')).toContainText(
      '$401,550.80',
    );
  });
});

test.describe('Break-even sale price (spec 013 US2)', () => {
  test('4: break-even and cushion, and a loss after one year', async ({
    page,
  }) => {
    await enterReference(page);
    await expect(page.getByTestId('sale-break-even-price')).toContainText(
      '$346,093.91',
    );
    await expect(page.getByTestId('sale-cushion')).toContainText(
      '$162,817.80 over break-even',
    );
    await expect(page.getByTestId('sale-break-even-pct')).toContainText(
      '86.5%',
    );

    await sellAfter(page, '1');
    await expect(page.getByTestId('sale-verdict')).toHaveText('Loss');
    await expect(row(page, 'sale-profit')).toHaveText('−$7,371.49');
    await expect(page.getByTestId('sale-break-even-price')).toContainText(
      '$421,926.33',
    );
    await expect(page.getByTestId('sale-cushion')).toContainText(
      '$7,926.33 short of break-even',
    );

    await sellAfter(page, '30');
    await expect(page.getByTestId('sale-break-even-price')).toContainText(
      'Profitable at any sale price',
    );
  });
});

test.describe('Tax on sale (spec 013 US3)', () => {
  test('6: off by default; on shows the labelled estimate; bad input hides only it', async ({
    page,
  }) => {
    await enterReference(page);
    await expect(page.getByTestId('sale-tax')).toHaveCount(0);
    await expect(
      page.getByRole('textbox', { name: 'Capital gains rate', exact: true }),
    ).toHaveCount(0);

    await page
      .getByTestId('sale-tax-toggle')
      .getByRole('radio', { name: 'On' })
      .click();
    const tax = page.getByTestId('sale-tax');
    await expect(tax).toContainText(
      'Illustrative planning estimate — not tax advice.',
    );
    await expect(row(page, 'sale-tax-depreciation')).toHaveText('$81,454.52');
    await expect(row(page, 'sale-tax-recapture')).toHaveText('−$20,363.63');
    await expect(row(page, 'sale-tax-capital-gains')).toHaveText(
      '−$10,993.18',
    );
    await expect(row(page, 'sale-after-tax-profit')).toHaveText('$120,063.74');

    await fillNumberField(page, 'Capital gains rate', '50');
    await page.keyboard.press('Tab');
    await expect(
      page.getByText('Capital gains rate must be between 0% and 40%.'),
    ).toBeVisible();
    await expect(row(page, 'sale-after-tax-profit')).toHaveText('—');
    await expect(row(page, 'sale-profit')).toHaveText('$151,420.55');
  });

  test('warns about short-term gains', async ({ page }) => {
    await enterReference(page);
    await page
      .getByTestId('sale-tax-toggle')
      .getByRole('radio', { name: 'On' })
      .click();
    await sellAfter(page, '1');
    await expect(page.getByTestId('sale-tax-short-term')).toBeVisible();
  });
});

test('7: has no horizontal page scroll at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await enterReference(page);
  await page
    .getByTestId('sale-tax-toggle')
    .getByRole('radio', { name: 'On' })
    .click();
  await expect(page.getByTestId('sale-tax')).toBeVisible();
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
