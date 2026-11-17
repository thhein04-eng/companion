import { expect, test, type Page } from '@playwright/test';
import { clearNumberField, fillNumberField } from './helpers';

/**
 * quickstart.md Scenario 1 (reference vector A): $250k purchase, 25% down
 * ($62,500), 7% / 30yr, $3,000/yr tax, $1,200/yr insurance, $2,400 rent with
 * default 5/8/5/5% assumptions, $7,500 closing costs, $10,000 rehab.
 */
async function enterScenarioOne(page: Page, { withCashInvested = true } = {}) {
  await page.goto('/deal-analyzer');
  await fillNumberField(page, 'Home price', '250000');
  // Down payment defaults to percent mode: 25% of $250k = $62,500.
  await fillNumberField(page, 'Down payment', '25');
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Annual property tax', '3000');
  await fillNumberField(page, "Annual homeowner's insurance", '1200');
  await fillNumberField(page, 'Monthly rent', '2400');
  await page.keyboard.press('Tab');
  if (withCashInvested) {
    await fillNumberField(page, 'Closing costs', '7500');
    await fillNumberField(page, 'Rehab budget', '10000');
    await page.keyboard.press('Tab');
  }
}

test.describe('Deal Analyzer', () => {
  test('US1: income vs. expenses card shows NOI, debt service, and cash flow', async ({ page }) => {
    await enterScenarioOne(page, { withCashInvested: false });

    const card = page.getByRole('region', { name: 'Rental Income vs. Operating Expenses' });
    await expect(card).toBeVisible();
    await expect(card.getByTestId('row-noi')).toContainText('$1,498.00');
    await expect(card.getByTestId('row-debt-service')).toContainText('$1,247.44');
    await expect(card.getByTestId('row-cash-flow')).toContainText('$250.56');

    await card.getByRole('tab', { name: 'Annual' }).click();
    await expect(card.getByTestId('row-noi')).toContainText('$17,976.00');
    await expect(card.getByTestId('row-cash-flow')).toContainText('$3,006.72');

    await card.getByRole('tab', { name: 'Monthly' }).click();
    await fillNumberField(page, 'Monthly rent', '1000');
    await page.keyboard.press('Tab');
    await expect(card.getByTestId('row-cash-flow')).toContainText('Negative');
  });

  test('US2: LTV and Cash-on-Cash badges update in real time', async ({ page }) => {
    await enterScenarioOne(page);

    const badges = page.getByRole('group', { name: 'Key deal metrics' });
    const ltv = badges.getByTestId('badge-ltv');
    const coc = badges.getByTestId('badge-cash-on-cash');
    await expect(ltv).toContainText('75.0%');
    await expect(coc).toContainText('3.8%');

    await fillNumberField(page, 'Monthly rent', '1500');
    await page.keyboard.press('Tab');
    await expect(coc).toContainText('Negative');
    await expect(coc).toContainText(/-\d+\.\d%/);

    await fillNumberField(page, 'Monthly rent', '2400');
    await fillNumberField(page, 'Down payment', '0');
    await fillNumberField(page, 'Closing costs', '0');
    await fillNumberField(page, 'Rehab budget', '0');
    await page.keyboard.press('Tab');
    await expect(coc).toContainText('N/A');

    await clearNumberField(page, 'Home price');
    await page.keyboard.press('Tab');
    await expect(ltv).toContainText('N/A');
  });

  test('US3: cap rate and rules of thumb with accessible explanations', async ({ page }) => {
    await enterScenarioOne(page);

    const metrics = page.getByTestId('deal-metrics');
    await expect(metrics.getByTestId('cap-rate')).toContainText('7.19%');

    const onePercent = metrics.getByTestId('rule-1-rule');
    await expect(onePercent).toContainText('Fail');
    await expect(onePercent).toContainText('$2,500');

    const fiftyPercent = metrics.getByTestId('rule-50-rule');
    await expect(fiftyPercent).toContainText('Pass');
    await expect(fiftyPercent).toContainText('37.6%');
    await expect(fiftyPercent).toContainText('-$47.44');

    const explanation = page.getByText('Monthly rent should be at least 1% of the purchase price.');
    await onePercent.getByRole('button', { name: 'About the 1% Rule' }).focus();
    await page.keyboard.press('Enter');
    await expect(explanation).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(explanation).toBeHidden();

    await fiftyPercent.getByRole('button', { name: 'About the 50% Rule' }).hover();
    await expect(page.getByText(/typically run about 50% of gross rent/)).toBeVisible();
    await page.mouse.move(0, 0);

    await clearNumberField(page, 'Home price');
    await page.keyboard.press('Tab');
    await expect(metrics.getByTestId('cap-rate')).toContainText('N/A');
    await expect(onePercent).toContainText('N/A');
  });

  test('US4: comparison shows deal metrics per scenario and rental inputs persist', async ({ page }) => {
    await enterScenarioOne(page);

    await page.getByRole('button', { name: '+ Add scenario' }).click();
    await fillNumberField(page, 'Monthly rent', '2800');
    await page.keyboard.press('Tab');

    const grid = page.getByText('Compare scenarios').locator('..').locator('table');
    for (const column of ['Cash Flow /mo', 'NOI /yr', 'Cap Rate', 'CoC']) {
      await expect(grid.locator('thead')).toContainText(column);
    }
    await expect(grid.locator('tbody tr')).toHaveCount(2);
    await expect(grid.locator('tbody tr').nth(0)).toContainText('$250.56');
    await expect(grid.locator('tbody tr').nth(1)).not.toContainText('—');

    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Monthly rent', exact: true })).toHaveValue('$2,800.00');

    await page.getByRole('button', { name: '+ Add scenario' }).click();
    await page.getByRole('button', { name: 'Remove rental analysis' }).click();
    await expect(grid.locator('tbody tr')).toHaveCount(3);
    await expect(grid.locator('tbody tr').nth(2)).toContainText('—');
  });

  test('a negative custom expense shows a field error and holds back the deal metrics', async ({ page }) => {
    // The amount field clamps typed values at $0, so seed a saved session that has a negative one.
    await page.goto('/deal-analyzer');
    await page.evaluate(() => {
      const scenario = {
        id: 'neg',
        name: 'Negative expense',
        principal: 187500,
        annualInterestRatePct: 7,
        termMonths: 360,
        startDate: '2027-01-01',
        paymentFrequency: 'monthly',
        homePrice: 250000,
        downPayment: { percent: 25 },
        annualPropertyTax: 3000,
        annualInsurance: 1200,
        pmiAnnualRatePct: null,
        monthlyHoa: null,
        extraPayments: [],
        principalIsOverridden: false,
        rental: {
          grossMonthlyRent: 2400,
          otherMonthlyIncome: 0,
          vacancyPct: 5,
          managementPct: 8,
          maintenanceReservePct: 5,
          capexReservePct: 5,
          closingCosts: 7500,
          rehabBudget: 10000,
          customExpenses: [{ id: 'water', label: 'Water', monthlyAmount: -50 }],
        },
      };
      sessionStorage.setItem(
        'amortization:scenarios',
        JSON.stringify({ scenarios: [scenario], activeScenarioId: 'neg' })
      );
    });
    await page.reload();

    await expect(page.locator('[data-slot="field-error"]', { hasText: 'Water cannot be negative.' })).toBeVisible();
    await expect(page.getByTestId('badge-cash-on-cash')).toHaveCount(0);
    // Rental errors never block the loan figures here or the schedule on
    // /amortization (FR-015; the schedule moved there in spec 003).
    await expect(page.getByText('Total estimated monthly payment').locator('..')).toContainText('$1,597.44');
    await page.goto('/amortization');
    await expect(page.getByRole('heading', { name: 'Amortization schedule' })).toBeVisible();
  });

  test('US4: a session saved before the Deal Analyzer loads without errors (FR-016)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/deal-analyzer');
    await page.evaluate(() => {
      const legacy = {
        id: 'legacy',
        name: 'Legacy scenario',
        principal: 300000,
        annualInterestRatePct: 6.5,
        termMonths: 360,
        startDate: '2027-01-01',
        paymentFrequency: 'monthly',
        homePrice: null,
        downPayment: null,
        annualPropertyTax: null,
        annualInsurance: null,
        pmiAnnualRatePct: null,
        monthlyHoa: null,
        extraPayments: [],
        principalIsOverridden: false,
      };
      sessionStorage.setItem(
        'amortization:scenarios',
        JSON.stringify({ scenarios: [legacy], activeScenarioId: 'legacy' })
      );
    });
    await page.reload();

    await expect(page.getByRole('tab', { name: /Legacy scenario/ })).toBeVisible();
    await expect(page.getByText('Enter rent to analyze this as a rental.')).toBeVisible();
    await expect(page.getByTestId('badge-cash-on-cash')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('FR-017: money, badge, and cap-rate formatting', async ({ page }) => {
    await enterScenarioOne(page);

    const card = page.getByRole('region', { name: 'Rental Income vs. Operating Expenses' });
    await expect(card.getByTestId('row-gsi')).toHaveText(/\$2,400\.00$/);
    await card.getByRole('tab', { name: 'Annual' }).click();
    await expect(card.getByTestId('row-gsi')).toHaveText(/\$28,800\.00$/);

    await expect(page.getByTestId('badge-ltv')).toHaveText(/\d+\.\d%$/);
    await expect(page.getByTestId('badge-cash-on-cash')).toHaveText(/\d+\.\d%$/);
    await expect(page.getByTestId('cap-rate')).toContainText(/\d+\.\d{2}%/);
    await expect(page.getByTestId('total-cash-invested')).toContainText('$80,000.00');
  });

  test('FR-015: invalid rental input never blocks the loan figures or schedule (quickstart Scenario 4)', async ({
    page,
  }) => {
    await enterScenarioOne(page);
    await fillNumberField(page, 'Vacancy rate', '150');
    await page.keyboard.press('Tab');

    // On the Deal Analyzer page: the rental error shows, deal metrics hide,
    // and the loan's monthly payment is still computed.
    await expect(page.getByText('Vacancy rate must be between 0% and 100%.')).toBeVisible();
    await expect(page.getByTestId('deal-metrics')).toHaveCount(0);
    await expect(page.getByText('Total estimated monthly payment').locator('..')).toContainText('$1,597.44');

    // The schedule itself now lives on the Amortization page (spec 003) and
    // is still produced for the same session's scenario.
    await page.goto('/amortization');
    await expect(page.getByRole('heading', { name: 'Amortization schedule' })).toBeVisible();
    await expect(page.locator('table').last().locator('tbody tr')).toHaveCount(12);
    await expect(page.getByText('Payments 1–12 of 360')).toBeVisible();
  });
});
