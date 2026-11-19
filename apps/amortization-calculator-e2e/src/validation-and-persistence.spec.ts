import { expect, test } from '@playwright/test';
import {
  closeDealSheet,
  dealField,
  fillNumberField,
  openDealSheet,
  skipSetupFor,
} from './helpers';

// Spec 010 US3: these specs test other stories, so first-run setup never opens.
test.beforeEach(async ({ page }) => {
  await skipSetupFor(page);
});

// quickstart.md Scenario 5: validation & edge cases (FR-009, FR-012).
test('validates inputs and retains scenario data for the session', async ({
  page,
}) => {
  await page.goto('/amortization');

  await fillNumberField(page, 'Loan amount', '0');
  await page.keyboard.press('Tab');
  // Spec 010: the field error shows in the Edit deal sheet; the page names the problem.
  await expect(
    (await openDealSheet(page)).getByText(
      'Loan amount must be greater than 0.',
    ),
  ).toBeVisible();
  await closeDealSheet(page);
  await expect(
    page.getByText('Fix the loan inputs to see the amortization schedule.'),
  ).toBeVisible();

  await fillNumberField(page, 'Loan amount', '275000');
  await fillNumberField(page, 'Annual interest rate', '0');
  await page.keyboard.press('Tab');
  await expect(
    page.getByText('Fix the loan inputs to see the amortization schedule.'),
  ).toBeHidden();

  // Same-tab reload: sessionStorage should retain the edited scenario (FR-012).
  await page.reload();
  await expect(await dealField(page, 'Loan amount')).toHaveValue('$275,000.00');
  await closeDealSheet(page);
});

test('starts a fresh default scenario in a brand-new session', async ({
  page,
  browser,
}) => {
  await page.goto('/amortization');
  await fillNumberField(page, 'Loan amount', '123456');
  await page.keyboard.press('Tab');

  // A new browser context has no sessionStorage carried over.
  const freshContext = await browser.newContext();
  const freshPage = await freshContext.newPage();
  await freshPage.goto(page.url());
  // A brand-new session has no home price, so first-run setup opens by itself (spec 010 US3).
  const setup = freshPage.getByRole('dialog', {
    name: 'Welcome, set up this deal',
  });
  await expect(setup).toBeVisible();
  await expect(
    setup.getByRole('textbox', { name: 'Loan amount', exact: true }),
  ).toHaveValue('$300,000.00');
  await freshContext.close();
});
