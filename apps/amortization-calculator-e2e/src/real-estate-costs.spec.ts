import { expect, test } from '@playwright/test';
import {
  closeDealSheet,
  fillNumberField,
  openDealSheet,
  skipSetupFor,
} from './helpers';

// Spec 010 US3: these specs test other stories, so first-run setup never opens.
test.beforeEach(async ({ page }) => {
  await skipSetupFor(page);
});

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

  // Spec 010: the payment breakdown lives in the Edit deal sheet.
  const sheet = await openDealSheet(page);
  await expect(
    sheet.getByText('Total estimated monthly payment'),
  ).toBeVisible();
  await expect(
    sheet.getByText(/PMI drops off automatically at payment #/),
  ).toBeVisible();
  await closeDealSheet(page);

  await fillNumberField(page, 'Monthly HOA fee', '50');
  await page.keyboard.press('Tab');

  // HOA must not appear in the schedule's own columns.
  const headerRow = page.locator('table').last().locator('thead');
  await expect(headerRow).not.toContainText('HOA');
});
