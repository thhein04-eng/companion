import { expect, test } from '@playwright/test';
import { fillNumberField, skipSetupFor } from './helpers';

// Spec 010 US3: these specs test other stories, so first-run setup never opens.
test.beforeEach(async ({ page }) => {
  await skipSetupFor(page);
});

// quickstart.md Scenario 4: multi-scenario comparison (User Story 4 / P3).
test('duplicating a scenario and editing it independently shows a side-by-side comparison', async ({
  page,
}) => {
  await page.goto('/amortization');

  await page.getByRole('button', { name: 'Add scenario', exact: true }).click();

  await fillNumberField(page, 'Annual interest rate', '6');

  await expect(page.getByText('Compare scenarios')).toBeVisible();
  const grid = page
    .locator('section', {
      has: page.getByRole('heading', { name: 'Compare scenarios' }),
    })
    .locator('table');
  await expect(grid.locator('tbody tr')).toHaveCount(2);

  // Removing a scenario drops the comparison back to a single scenario.
  // New scenarios are named "Scenario N" (c18b68f), not "<name> (copy)".
  await page
    .getByRole('button', { name: 'Remove Scenario 2', exact: true })
    .click();
  await expect(page.getByText('Compare scenarios')).toBeHidden();
});
