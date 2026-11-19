import { expect, test, type Page } from '@playwright/test';
import {
  clearNumberField,
  closeDealSheet,
  dealField,
  fillNumberField,
  skipSetupFor,
} from './helpers';

// Spec 010 US3: these specs test other stories, so first-run setup never opens.
test.beforeEach(async ({ page }) => {
  await skipSetupFor(page);
});

const STORAGE_KEY = 'amortization:scenarios';

/**
 * Spec 008 reference (research.md § Reference scenario): the spec 006 property
 * ($400k, 25% down, 7% / 30yr, $4,800 tax, $1,800 insurance, $3,800 rent) with
 * appreciation 3%, rent growth 2.5%, expense growth 2.5%.
 */
async function enterReference(page: Page, { typical = true } = {}) {
  await page.goto('/wealth');
  await fillNumberField(page, 'Home price', '400000');
  await fillNumberField(page, 'Down payment', '25');
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Annual property tax', '4800');
  await fillNumberField(page, "Annual homeowner's insurance", '1800');
  await fillNumberField(page, 'Monthly rent', '3800');
  await page.keyboard.press('Tab');
  if (typical) {
    await fillNumberField(page, 'Appreciation', '3');
    await fillNumberField(page, 'Rent growth', '2.5');
    await fillNumberField(page, 'Expense growth', '2.5');
    await page.keyboard.press('Tab');
  }
}

const row = (page: Page, year: number, column: string) =>
  page.getByTestId(`wealth-row-${year}`).getByTestId(column);

const money = (text: string) => Number(text.replace(/[$,]/g, ''));

/** Simulates an older session (no `rental.wealth`) that has a recurring extra payment, then reloads. */
async function seedLegacySessionWithExtraPayment(page: Page) {
  await page.evaluate((key) => {
    const state = JSON.parse(window.sessionStorage.getItem(key) ?? '{}');
    for (const scenario of state.scenarios ?? []) {
      scenario.extraPayments = [
        { id: 'x', kind: 'recurring', amount: 200, startPeriod: 1 },
      ];
      if (scenario.rental) delete scenario.rental.wealth;
    }
    window.sessionStorage.setItem(key, JSON.stringify(state));
  }, STORAGE_KEY);
  await page.reload();
}

test.describe('Wealth Projection page (spec 008 US1)', () => {
  test('has its own route, title, heading and nav link', async ({ page }) => {
    await page.goto('/wealth');
    await expect(page).toHaveTitle('Wealth Projection · Companion');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Wealth Projection' }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('navigation', { name: 'Primary' })
        .getByRole('link', { name: 'Wealth Projection' }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('wealth-na')).toHaveText(
      'Add rent to project net worth.',
    );
  });

  test('projects the reference property to the cent', async ({ page }) => {
    await enterReference(page);
    await expect(page.getByTestId('wealth-summary')).toContainText(
      'In year 10',
    );
    await expect(page.getByTestId('wealth-net-worth')).toHaveText(
      '$360,051.02',
    );
    await expect(page.getByTestId('wealth-equity')).toHaveText('$280,129.40');
    await expect(page.getByTestId('wealth-cum-cash-flow')).toHaveText(
      '$79,921.62',
    );
    await expect(page.getByTestId('wealth-multiple')).toHaveText('3.6×');
    await expect(row(page, 0, 'net-worth')).toHaveText('$100,000.00');
    await expect(row(page, 5, 'net-worth')).toHaveText('$211,428.70');
    await expect(page.getByTestId('chart-net-worth')).toBeVisible();
  });

  test('the 5-year preset shortens the projection', async ({ page }) => {
    await enterReference(page);
    await page
      .getByTestId('wealth-horizon-presets')
      .getByRole('radio', { name: '5 yrs' })
      .click();
    await expect(page.getByTestId('wealth-summary')).toContainText('In year 5');
    await expect(page.getByTestId('wealth-net-worth')).toHaveText(
      '$211,428.70',
    );
    await expect(page.getByTestId('wealth-row-6')).toHaveCount(0);
  });

  test('explains a missing purchase price', async ({ page }) => {
    await enterReference(page);
    await clearNumberField(page, 'Home price');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('wealth-na')).toHaveText(
      'Enter a purchase price to project equity and net worth.',
    );
  });

  test('has no horizontal page scroll at phone width', async ({ page }) => {
    await enterReference(page);
    await page.setViewportSize({ width: 375, height: 800 });
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

test.describe('Drivers (spec 008 US2)', () => {
  test('typical rates and forced appreciation', async ({ page }) => {
    await enterReference(page, { typical: false });
    await page.getByTestId('wealth-typical-rates').click();
    await expect(page.getByTestId('wealth-net-worth')).toHaveText(
      '$360,051.02',
    );

    await fillNumberField(page, 'Forced appreciation', '20000');
    await page.keyboard.press('Tab');
    await expect(row(page, 0, 'equity')).toHaveText('$120,000.00');
    await expect(row(page, 0, 'forced-appreciation')).toHaveText('$20,000.00');

    const parts = await Promise.all(
      [
        'initial-equity',
        'principal-paid',
        'market-appreciation',
        'forced-appreciation',
      ].map(async (c) => money(await row(page, 10, c).innerText())),
    );
    await expect(row(page, 10, 'initial-equity')).toHaveText('$100,000.00');
    const equity = money(await row(page, 10, 'equity').innerText());
    expect(Math.round(parts.reduce((a, b) => a + b, 0) * 100) / 100).toBe(
      equity,
    );
  });

  test('an invalid growth rate waits for a valid value; growth is shared', async ({
    page,
  }) => {
    await enterReference(page);
    await fillNumberField(page, 'Appreciation', '30');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('wealth-assumptions')).toContainText(
      'must be between -10% and 25%',
    );
    await expect(page.getByTestId('wealth-na')).toHaveText(
      'Fix the rental inputs to see the projection.',
    );
    await expect(await dealField(page, 'Loan amount')).toBeEditable();
    await closeDealSheet(page);

    await fillNumberField(page, 'Appreciation', '3');
    await page.keyboard.press('Tab');
    await page.goto('/deal-analyzer');
    await expect(
      page.getByRole('textbox', { name: 'Appreciation', exact: true }),
    ).toHaveValue(/^3/);
    await expect(page.getByTestId('chart-equity')).toContainText(
      'Appreciation',
    );
  });
});

test.describe('Tax (spec 008 US3)', () => {
  test('shows depreciation, interest and the tax effect', async ({ page }) => {
    await enterReference(page);
    await expect(row(page, 1, 'depreciation')).toHaveText('$11,636.36');
    await expect(row(page, 1, 'interest')).toHaveText('$20,903.45');
    await expect(row(page, 1, 'taxable')).toHaveText('-$4,027.81');
    await expect(row(page, 1, 'tax-effect')).toHaveText('$966.67');
    await expect(row(page, 10, 'net-worth-after-tax')).toHaveText(
      '$358,581.92',
    );

    await fillNumberField(page, 'Marginal tax rate', '0');
    await page.keyboard.press('Tab');
    await expect(row(page, 10, 'net-worth-after-tax')).toHaveText(
      '$360,051.02',
    );
  });

  test('invalid tax inputs blank only the tax figures', async ({ page }) => {
    await enterReference(page);
    await fillNumberField(page, 'Land value share', '100');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('wealth-assumptions')).toContainText(
      'Land value must be at least 0% and less than 100%.',
    );
    await expect(page.getByTestId('wealth-cum-tax')).toHaveText('—');
    await expect(page.getByTestId('wealth-net-worth')).toHaveText(
      '$360,051.02',
    );
    await expect(page.getByTestId('chart-net-worth')).not.toContainText(
      'Net worth after tax',
    );
  });

  test('stops depreciating after 27.5 years', async ({ page }) => {
    await enterReference(page);
    await fillNumberField(page, 'Horizon (years)', '30');
    await page.keyboard.press('Tab');
    await expect(row(page, 28, 'depreciation')).toHaveText('$5,818.28');
    await expect(row(page, 29, 'depreciation')).toHaveText('$0.00');
  });

  test('persists assumptions; old sessions and extra payments', async ({
    page,
  }) => {
    await enterReference(page);
    await fillNumberField(page, 'Horizon (years)', '7');
    await fillNumberField(page, 'Forced appreciation', '15000');
    await fillNumberField(page, 'Land value share', '25');
    await fillNumberField(page, 'Marginal tax rate', '32');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('wealth-extra-note')).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('wealth-summary')).toContainText('In year 7');
    await expect(
      page.getByRole('textbox', { name: 'Land value share', exact: true }),
    ).toHaveValue('25');
    await expect(
      page.getByRole('textbox', { name: 'Marginal tax rate', exact: true }),
    ).toHaveValue('32');
    await expect(row(page, 0, 'forced-appreciation')).toHaveText('$15,000.00');

    await seedLegacySessionWithExtraPayment(page);
    await expect(page.getByTestId('wealth-extra-note')).toBeVisible();
    await expect(page.getByTestId('wealth-summary')).toContainText(
      'In year 10',
    );
    await expect(
      page.getByRole('textbox', { name: 'Land value share', exact: true }),
    ).toHaveValue('20');
    await expect(page.getByTestId('wealth-assumptions')).not.toContainText(
      'must be',
    );
  });
});
