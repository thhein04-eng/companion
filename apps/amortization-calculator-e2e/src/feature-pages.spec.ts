import { expect, test } from '@playwright/test';
import {
  closeDealSheet,
  dealField,
  fillNumberField,
  skipSetupFor,
} from './helpers';

// Spec 010 US3: these specs test other stories, so first-run setup never opens.
test.beforeEach(async ({ page }) => {
  await skipSetupFor(page);
});

/**
 * Spec 003 User Story 1 — each feature on its own page
 * (contracts/routes-and-navigation.md "Routes" and "Page section contract").
 */
test.describe('Feature pages', () => {
  test('(a) / redirects to /amortization', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/amortization$/);
  });

  test('(b) each page has its own title and h1', async ({ page }) => {
    await page.goto('/amortization');
    await expect(page).toHaveTitle('Amortization Calculator · Companion');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Amortization Calculator',
    );

    await page.goto('/deal-analyzer');
    await expect(page).toHaveTitle('Rental Deal Analyzer · Companion');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Rental Deal Analyzer',
    );
  });

  test('(c) /amortization shows the schedule and no rental inputs', async ({
    page,
  }) => {
    await page.goto('/amortization');
    await expect(
      page.getByRole('heading', { name: 'Amortization schedule', level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Extra payments', level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'Monthly rent', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Deal analyzer', level: 2 }),
    ).toHaveCount(0);
  });

  test('(d) /deal-analyzer shows financing + rental inputs and no schedule', async ({
    page,
  }) => {
    await page.goto('/deal-analyzer');
    // Spec 010: the shared loan and cost inputs moved into the Deal Strip's sheet.
    await expect(page.getByRole('region', { name: 'Deal' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Deal analyzer', level: 2 }),
    ).toBeVisible();
    for (const name of ['Loan', 'Real-estate costs']) {
      await expect(page.getByRole('heading', { name, level: 2 })).toHaveCount(
        0,
      );
    }
    await expect(
      page.getByRole('heading', { name: 'Amortization schedule', level: 2 }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Extra payments', level: 2 }),
    ).toHaveCount(0);
  });

  test('(e) a value entered on one page is there on the other', async ({
    page,
  }) => {
    await page.goto('/amortization');
    await fillNumberField(page, 'Home price', '250000');
    await page.keyboard.press('Tab');

    await page.goto('/deal-analyzer');
    await expect(await dealField(page, 'Home price')).toHaveValue(
      '$250,000.00',
    );
    await closeDealSheet(page);
  });

  test('(f) editing on /amortization keeps the rental data', async ({
    page,
  }) => {
    await page.goto('/deal-analyzer');
    await fillNumberField(page, 'Monthly rent', '2400');
    await page.keyboard.press('Tab');

    await page.goto('/amortization');
    await fillNumberField(page, 'Annual interest rate', '7');
    await page.keyboard.press('Tab');

    await page.goto('/deal-analyzer');
    await expect(await dealField(page, 'Monthly rent')).toHaveValue(
      '$2,400.00',
    );
    await closeDealSheet(page);
  });

  test('(g) comparison columns differ by page', async ({ page }) => {
    await page.goto('/amortization');
    await page
      .getByRole('button', { name: 'Add scenario', exact: true })
      .click();

    const grid = page
      .locator('section', {
        has: page.getByRole('heading', { name: 'Compare scenarios' }),
      })
      .locator('table');
    await expect(grid.locator('tbody tr')).toHaveCount(2);
    await expect(grid.locator('thead')).not.toContainText('Cap Rate');

    await page.goto('/deal-analyzer');
    const dealGrid = page
      .locator('section', {
        has: page.getByRole('heading', { name: 'Compare scenarios' }),
      })
      .locator('table');
    await expect(dealGrid.locator('tbody tr')).toHaveCount(2);
    await expect(dealGrid.locator('thead')).toContainText('Cap Rate');
  });

  test('(h) an invalid loan on /deal-analyzer shows the error and hides deal metrics', async ({
    page,
  }) => {
    await page.goto('/deal-analyzer');
    await fillNumberField(page, 'Monthly rent', '2400');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('deal-metrics')).toBeVisible();

    await fillNumberField(page, 'Loan amount', '0');
    await page.keyboard.press('Tab');
    await expect(
      page.getByText('Fix the loan inputs to see the deal analysis.'),
    ).toBeVisible();
    await expect(page.getByTestId('deal-metrics')).toHaveCount(0);
  });

  // The remove button only renders with 2+ scenarios, so "remove the last
  // one" is not reachable from the UI; this covers the reachable case.
  test('(i) removing a scenario on one page removes it on the other', async ({
    page,
  }) => {
    await page.goto('/deal-analyzer');
    await fillNumberField(page, 'Home price', '400000');
    await page.keyboard.press('Tab');
    await page
      .getByRole('button', { name: 'Add scenario', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Remove Scenario 1', exact: true })
      .click();

    await page.goto('/amortization');
    const tabs = page
      .getByRole('tablist', { name: 'Loan scenarios' })
      .getByRole('tab');
    await expect(tabs).toHaveCount(1);
    await expect(tabs.first()).toHaveText('Scenario 2');
    await expect(await dealField(page, 'Home price')).toHaveValue(
      '$400,000.00',
    );
    await closeDealSheet(page);
  });
});
