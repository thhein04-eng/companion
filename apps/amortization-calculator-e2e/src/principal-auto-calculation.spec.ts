import { expect, test } from '@playwright/test';
import { fillNumberField } from './helpers';

// quickstart.md Scenario 2, steps 4-6 (FR-014): loan amount auto-calculation & override.
test('auto-calculates the loan amount, keeps a manual override, then discards it when inputs change again', async ({
  page,
}) => {
  await page.goto('/amortization');

  const loanAmount = page.getByRole('textbox', { name: 'Loan amount', exact: true });

  // Step 4: entering home price + down payment (percent mode, the default)
  // auto-calculates the loan amount.
  await fillNumberField(page, 'Home price', '350000');
  await fillNumberField(page, 'Down payment', '10');
  await page.keyboard.press('Tab');
  await expect(loanAmount).toHaveValue('$315,000.00');

  // Step 5: a manual override sticks.
  await fillNumberField(page, 'Loan amount', '310000');
  await page.keyboard.press('Tab');
  await expect(loanAmount).toHaveValue('$310,000.00');

  // Step 6: changing the down payment again discards the override and recalculates.
  await fillNumberField(page, 'Down payment', '20');
  await page.keyboard.press('Tab');
  await expect(loanAmount).toHaveValue('$280,000.00');
});
