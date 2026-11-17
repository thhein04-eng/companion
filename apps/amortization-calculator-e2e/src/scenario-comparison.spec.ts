import { expect, test } from '@playwright/test';
import { fillNumberField } from './helpers';

// quickstart.md Scenario 4: multi-scenario comparison (User Story 4 / P3).
test('duplicating a scenario and editing it independently shows a side-by-side comparison', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByRole('button', { name: '+ Add scenario' }).click();

  await fillNumberField(page, 'Annual interest rate', '6');

  await expect(page.getByText('Compare scenarios')).toBeVisible();
  const grid = page.getByText('Compare scenarios').locator('..').locator('table');
  await expect(grid.locator('tbody tr')).toHaveCount(2);

  // Removing a scenario drops the comparison back to a single scenario.
  await page.getByRole('button', { name: /Remove Scenario 1 \(copy\)/ }).click();
  await expect(page.getByText('Compare scenarios')).toBeHidden();
});
