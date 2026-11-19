import { expect, test } from '@playwright/test';
import { fillNumberField, skipSetupFor } from './helpers';

// Spec 010 US3: these specs test other stories, so first-run setup never opens.
test.beforeEach(async ({ page }) => {
  await skipSetupFor(page);
});

// quickstart.md Scenario 3: extra payments (User Story 3 / P2).
test('shows interest and time saved after adding a recurring extra payment', async ({
  page,
}) => {
  await page.goto('/amortization');

  await fillNumberField(page, 'Amount', '200');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(
    page.getByText(/saves .* in interest and .* payments versus the baseline/),
  ).toBeVisible();
  await expect(page.getByText('$200.00 / month from payment #1')).toBeVisible();
});
