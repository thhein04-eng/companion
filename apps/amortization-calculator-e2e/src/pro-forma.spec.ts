import { expect, test, type Page } from '@playwright/test';
import {
  closeDealSheet,
  dealField,
  fillNumberField,
  openDealSheet,
  skipSetupFor,
} from './helpers';

const STORAGE_KEY = 'amortization:scenarios';

/**
 * Spec 009 research.md § Reference scenario: the spec 006 property ($400k, 25% down, 7% / 30 yr,
 * tax $4,800, insurance $1,800, rent $3,800) with example growth 3 / 2.5 / 3.5. Shared inputs go
 * through the Deal Strip's sheet (spec 010); growth is set on /pro-forma itself.
 */
async function enterReference(page: Page, { growth = true } = {}) {
  await page.goto('/pro-forma');
  await fillNumberField(page, 'Home price', '400000');
  await fillNumberField(page, 'Down payment', '25');
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Annual property tax', '4800');
  await fillNumberField(page, "Annual homeowner's insurance", '1800');
  await fillNumberField(page, 'Monthly rent', '3800');
  if (growth) {
    await fillNumberField(page, 'Rent growth', '3');
    await fillNumberField(page, 'Expense growth', '2.5');
    await fillNumberField(page, 'Appreciation', '3.5');
    await page.keyboard.press('Tab');
  }
}

const cell = (page: Page, row: string, key: string) =>
  page.getByTestId(row).getByTestId(key);

async function seed(page: Page, edit: string) {
  await page.evaluate(
    ([key, body]) => {
      const state = JSON.parse(window.sessionStorage.getItem(key) ?? '{}');
      for (const scenario of state.scenarios ?? []) {
        new Function('scenario', body)(scenario);
      }
      window.sessionStorage.setItem(key, JSON.stringify(state));
    },
    [STORAGE_KEY, edit] as const,
  );
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  await skipSetupFor(page);
});

test.describe('Hold & Exit page (spec 009 US1)', () => {
  test('has its own route, title, heading and nav link', async ({ page }) => {
    await page.goto('/pro-forma');
    await expect(page).toHaveTitle('Hold & Exit Pro Forma · Companion');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Hold & Exit Pro Forma' }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('navigation', { name: 'Primary' })
        .getByRole('link', { name: 'Hold & Exit' }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('pro-forma-na')).toHaveText(
      'Add rent to model a sale.',
    );
    // Spec 010: shared inputs live in the Deal Strip, not on the page.
    await expect(page.getByRole('region', { name: 'Deal' })).toBeVisible();
  });

  test('reproduces the reference exit', async ({ page }) => {
    await enterReference(page);
    await expect(page.getByTestId('exit-sale-price')).toContainText(
      '$508,911.71',
    );
    await expect(page.getByTestId('exit-net-proceeds')).toContainText(
      '$199,845.65',
    );
    await expect(page.getByTestId('exit-irr')).toContainText('15.66%');
    await expect(page.getByTestId('exit-profit')).toContainText('$151,420.55');
    await expect(page.getByTestId('exit-multiple')).toContainText('2.51×');
  });

  test('compares hold periods with the chosen one marked', async ({ page }) => {
    await enterReference(page);
    await expect(page.getByTestId('hold-5-irr')).toHaveText('14.96%');
    await expect(page.getByTestId('hold-10-irr')).toHaveText('15.71%');
    await expect(
      page
        .getByTestId('hold-comparison')
        .getByRole('columnheader', { name: '7 yrs' }),
    ).toHaveAttribute('aria-current', 'true');
  });

  test('the 10-year preset changes the exit', async ({ page }) => {
    await enterReference(page);
    await page
      .getByTestId('hold-presets')
      .getByRole('radio', { name: '10 yrs' })
      .click();
    await expect(page.getByTestId('exit-net-proceeds')).toContainText(
      '$267,305.58',
    );
    await expect(page.getByTestId('exit-multiple')).toContainText('3.56×');
  });

  test('explains a missing purchase price', async ({ page }) => {
    await enterReference(page);
    const price = await dealField(page, 'Home price');
    await price.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Tab');
    await closeDealSheet(page);
    await expect(page.getByTestId('pro-forma-na')).toHaveText(
      'Enter a purchase price to model a sale.',
    );
  });

  test('has no horizontal page scroll at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await enterReference(page);
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

test.describe('Assumptions (spec 009 US2)', () => {
  test('example rates reach the reference IRR', async ({ page }) => {
    await enterReference(page, { growth: false });
    await page.getByTestId('pro-forma-example-rates').click();
    await expect(page.getByTestId('exit-irr')).toContainText('15.66%');
  });

  test('the pro forma shows year 1 and the sale', async ({ page }) => {
    await enterReference(page);
    await expect(cell(page, 'pro-forma-row-1', 'noi')).toHaveText('$28,512.00');
    await expect(cell(page, 'pro-forma-row-1', 'cash-to-investor')).toHaveText(
      '$4,561.08',
    );
    await expect(cell(page, 'pro-forma-sale', 'net-proceeds')).toContainText(
      '$199,845.65',
    );
  });

  test('invalid selling costs hold back the exit, never the loan', async ({
    page,
  }) => {
    await enterReference(page);
    await fillNumberField(page, 'Selling costs', '20');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('exit-assumptions')).toContainText(
      'Selling costs must be between 0% and 15%.',
    );
    await expect(page.getByTestId('pro-forma-na')).toHaveText(
      'Fix the hold and exit assumptions to see the exit.',
    );
    await expect(await dealField(page, 'Loan amount')).toBeEditable();
    await closeDealSheet(page);
  });

  test('growth is shared with Wealth Projection', async ({ page }) => {
    await enterReference(page, { growth: false });
    await page.getByTestId('pro-forma-example-rates').click();
    await page.goto('/wealth');
    await expect(
      page.getByRole('textbox', { name: 'Appreciation', exact: true }),
    ).toHaveValue('3.5');
  });

  test('extra principal is an outflow to the investor', async ({ page }) => {
    await enterReference(page);
    await seed(
      page,
      "scenario.extraPayments = [{ id: 'x', kind: 'recurring', amount: 500, startPeriod: 1 }];",
    );
    await expect(page.getByTestId('exit-loan-payoff')).toContainText(
      '−$219,442.75',
    );
    await expect(page.getByTestId('exit-irr')).toContainText('14.82%');
    await expect(cell(page, 'pro-forma-row-1', 'extra-principal')).toHaveText(
      '$6,000.00',
    );
  });
});

test.describe('Tax (spec 009 US3)', () => {
  test('year 1 tax columns', async ({ page }) => {
    await enterReference(page);
    await expect(cell(page, 'pro-forma-row-1', 'depreciation')).toHaveText(
      '$11,636.36',
    );
    await expect(cell(page, 'pro-forma-row-1', 'interest')).toHaveText(
      '$20,903.45',
    );
    await expect(cell(page, 'pro-forma-row-1', 'tax-effect')).toHaveText(
      '$966.67',
    );
    await expect(cell(page, 'pro-forma-row-1', 'after-tax-cf')).toHaveText(
      '$5,527.75',
    );
  });

  test('after-tax returns', async ({ page }) => {
    await enterReference(page);
    await expect(page.getByTestId('exit-irr-after-tax')).toContainText(
      '15.88%',
    );
    await expect(page.getByTestId('exit-profit-after-tax')).toContainText(
      '$152,217.73',
    );
    await expect(page.getByTestId('exit-multiple-after-tax')).toContainText(
      '2.52×',
    );
  });

  test('a 0% tax rate makes after-tax equal pre-tax', async ({ page }) => {
    await enterReference(page);
    await fillNumberField(page, 'Marginal tax rate', '0');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('exit-irr-after-tax')).toContainText(
      '15.66%',
    );
  });

  test('an invalid land share hides only after-tax figures', async ({
    page,
  }) => {
    await enterReference(page);
    await fillNumberField(page, 'Land value share', '100');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('exit-assumptions')).toContainText(
      'Land value must be at least 0% and less than 100%.',
    );
    await expect(page.getByTestId('exit-irr-after-tax')).toContainText('—');
    await expect(page.getByTestId('exit-irr')).toContainText('15.66%');
  });

  test('assumptions persist across a reload', async ({ page }) => {
    await enterReference(page);
    await fillNumberField(page, 'Hold (years)', '9');
    await fillNumberField(page, 'Selling costs', '6');
    await fillNumberField(page, 'Land value share', '25');
    await fillNumberField(page, 'Marginal tax rate', '30');
    await page.keyboard.press('Tab');
    await page.reload();
    for (const [name, value] of [
      ['Hold (years)', '9'],
      ['Selling costs', '6'],
      ['Land value share', '25'],
      ['Marginal tax rate', '30'],
    ]) {
      await expect(
        page.getByRole('textbox', { name, exact: true }),
      ).toHaveValue(value);
    }
  });

  test('an old session without exit uses the defaults', async ({ page }) => {
    await enterReference(page);
    await seed(page, 'if (scenario.rental) delete scenario.rental.exit;');
    await expect(page.getByTestId('exit-summary')).toContainText(
      'Sale at end of year 7',
    );
    await expect(
      page.getByRole('textbox', { name: 'Selling costs', exact: true }),
    ).toHaveValue('7');
    await expect(page.locator('[data-slot="field-error"]')).toHaveCount(0);
  });

  test('notes shared forced appreciation', async ({ page }) => {
    await enterReference(page);
    await seed(
      page,
      'if (scenario.rental) scenario.rental.wealth = { ...(scenario.rental.wealth ?? {}), forcedAppreciation: 20000 };',
    );
    await expect(page.getByTestId('exit-forced-note')).toBeVisible();
  });

  test('the sheet still edits the shared inputs from this page', async ({
    page,
  }) => {
    await enterReference(page);
    const sheet = await openDealSheet(page);
    await expect(
      sheet.getByRole('textbox', { name: 'Monthly rent', exact: true }),
    ).toHaveValue('$3,800.00');
    await closeDealSheet(page);
  });
});
