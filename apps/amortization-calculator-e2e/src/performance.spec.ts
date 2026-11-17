import { expect, test } from '@playwright/test';
import { fillNumberField } from './helpers';

// SC-005: a 360-period schedule stays responsive to input changes (<1s).
// 004: rendered with "All" rows per page so every row is still measured.
test('recalculates and re-renders a 360-period schedule in under 1 second', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Rows per page' }).click();
  await page.getByRole('option', { name: 'All', exact: true }).click();
  await expect(page.locator('table').last().locator('tbody tr')).toHaveCount(360);

  const start = Date.now();
  await fillNumberField(page, 'Annual interest rate', '7');
  await page.keyboard.press('Tab');
  await expect(page.getByText('$1,995', { exact: false }).first()).toBeVisible();
  expect(Date.now() - start).toBeLessThan(1000);
});

// 004 SC-002 / 001 SC-005 at the default page size (12 rows per page).
test('recalculates a paginated schedule in under 1 second', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Payments 1–12 of 360')).toBeVisible();

  const start = Date.now();
  await fillNumberField(page, 'Annual interest rate', '7');
  await page.keyboard.press('Tab');
  await expect(page.getByText('$1,995', { exact: false }).first()).toBeVisible();
  expect(Date.now() - start).toBeLessThan(1000);
});

// SC-003: Deal Analyzer badges reflect an input change within 1 second.
test('updates the Cash-on-Cash badge within 1 second of a rent change', async ({ page }) => {
  await page.goto('/');
  await fillNumberField(page, 'Home price', '250000');
  await fillNumberField(page, 'Down payment', '25'); // percent mode: $62,500
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Annual property tax', '3000');
  await fillNumberField(page, "Annual homeowner's insurance", '1200');
  await fillNumberField(page, 'Monthly rent', '2400');
  await page.keyboard.press('Tab');
  await fillNumberField(page, 'Closing costs', '7500');
  await fillNumberField(page, 'Rehab budget', '10000');
  await page.keyboard.press('Tab');

  const coc = page.getByTestId('badge-cash-on-cash');
  await expect(coc).toContainText('3.8%');

  const start = Date.now();
  await fillNumberField(page, 'Monthly rent', '2000');
  await page.keyboard.press('Tab');
  await expect(coc).toContainText(/-\d+\.\d%/, { timeout: 1000 });
  expect(Date.now() - start).toBeLessThan(1000);
});
