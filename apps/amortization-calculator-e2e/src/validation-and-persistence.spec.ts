import { expect, test } from '@playwright/test';
import { fillNumberField } from './helpers';

// quickstart.md Scenario 5: validation & edge cases (FR-009, FR-012).
test('validates inputs and retains scenario data for the session', async ({ page }) => {
  await page.goto('/amortization');

  await fillNumberField(page, 'Loan amount', '0');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Loan amount must be greater than 0.')).toBeVisible();
  await expect(page.getByText('Fix the highlighted fields above')).toBeVisible();

  await fillNumberField(page, 'Loan amount', '275000');
  await fillNumberField(page, 'Annual interest rate', '0');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Fix the highlighted fields above')).toBeHidden();

  // Same-tab reload: sessionStorage should retain the edited scenario (FR-012).
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Loan amount', exact: true })).toHaveValue('$275,000.00');
});

test('starts a fresh default scenario in a brand-new session', async ({ page, browser }) => {
  await page.goto('/amortization');
  await fillNumberField(page, 'Loan amount', '123456');
  await page.keyboard.press('Tab');

  // A new browser context has no sessionStorage carried over.
  const freshContext = await browser.newContext();
  const freshPage = await freshContext.newPage();
  await freshPage.goto(page.url());
  await expect(
    freshPage.getByRole('textbox', { name: 'Loan amount', exact: true })
  ).toHaveValue('$300,000.00');
  await freshContext.close();
});
