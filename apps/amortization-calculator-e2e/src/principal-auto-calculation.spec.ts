import { expect, test } from '@playwright/test';
import { dealField, fillNumberField, skipSetupFor } from './helpers';

// Spec 010 US3: these specs test other stories, so first-run setup never opens.
test.beforeEach(async ({ page }) => {
  await skipSetupFor(page);
});

// quickstart.md Scenario 2, steps 4-6 (FR-014): loan amount auto-calculation & override.
test('auto-calculates the loan amount, keeps a manual override, then discards it when inputs change again', async ({
  page,
}) => {
  await page.goto('/amortization');

  // Spec 010: the loan amount lives in the Edit deal sheet.
  const loanAmount = () => dealField(page, 'Loan amount');

  // Step 4: entering home price + down payment (percent mode, the default)
  // auto-calculates the loan amount.
  await fillNumberField(page, 'Home price', '350000');
  await fillNumberField(page, 'Down payment', '10');
  await page.keyboard.press('Tab');
  await expect(await loanAmount()).toHaveValue('$315,000.00');

  // Step 5: a manual override sticks.
  await fillNumberField(page, 'Loan amount', '310000');
  await page.keyboard.press('Tab');
  await expect(await loanAmount()).toHaveValue('$310,000.00');

  // Step 6: changing the down payment again discards the override and recalculates.
  await fillNumberField(page, 'Down payment', '20');
  await page.keyboard.press('Tab');
  await expect(await loanAmount()).toHaveValue('$280,000.00');
});
