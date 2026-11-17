import { expect, test } from '@playwright/test';

// quickstart.md Scenario 1: baseline schedule (User Story 1 / P1).
test('shows the monthly payment and a full schedule ending at $0.00', async ({ page }) => {
  await page.goto('/amortization');

  await expect(page.getByRole('heading', { name: 'Amortization Calculator', level: 1 })).toBeVisible();

  // Defaults already match the $300,000 / 6.5% / 30yr scenario from quickstart.md.
  await expect(page.getByText('Principal & interest only')).toBeVisible();
  await expect(page.getByText('$1,896.20', { exact: false }).first()).toBeVisible();

  const rows = page.locator('table').last().locator('tbody tr');
  await expect(rows).toHaveCount(360);
  await expect(rows.last()).toContainText('$0.00');
});
