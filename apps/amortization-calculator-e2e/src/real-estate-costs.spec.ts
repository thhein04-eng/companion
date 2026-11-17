import { expect, test } from '@playwright/test';
import { fillNumberField } from './helpers';

// quickstart.md Scenario 2: real-estate costs (User Story 2 / P2).
test('separates total estimated monthly payment from principal & interest, and PMI drops off', async ({
  page,
}) => {
  await page.goto('/amortization');

  await fillNumberField(page, 'Home price', '350000');
  await fillNumberField(page, 'Annual property tax', '4200');
  await fillNumberField(page, "Annual homeowner's insurance", '1500');
  await fillNumberField(page, 'PMI rate', '0.5');
  await page.keyboard.press('Tab');

  await expect(page.getByText('Total estimated monthly payment')).toBeVisible();
  await expect(page.getByText(/PMI drops off automatically at payment #/)).toBeVisible();

  await fillNumberField(page, 'Monthly HOA fee', '50');
  await page.keyboard.press('Tab');

  // HOA must not appear in the schedule's own columns.
  const headerRow = page.locator('table').last().locator('thead');
  await expect(headerRow).not.toContainText('HOA');
});
