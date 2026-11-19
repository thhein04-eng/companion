import { expect, test } from '@playwright/test';
import {
  closeDealSheet,
  dealField,
  fillNumberField,
  openDealSheet,
  skipSetupFor,
} from './helpers';

// Spec 010 US3: these specs test other stories, so first-run setup never opens.
test.beforeEach(async ({ page }) => {
  await skipSetupFor(page);
});

// quickstart.md §3: balance chart (User Story 1 / FR-001, FR-005, FR-008).
test('balance chart', async ({ page }) => {
  await page.goto('/amortization');

  const chart = page.getByTestId('chart-balance');
  await expect(chart).toBeVisible();
  await expect(
    chart.getByRole('heading', { name: 'Remaining balance' }),
  ).toBeVisible();
  // One series → no legend.
  await expect(chart.getByRole('list', { name: 'Legend' })).toHaveCount(0);

  await fillNumberField(page, 'Amount', '200');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  const legend = chart.getByRole('list', { name: 'Legend' });
  await expect(legend.getByText('With extra payments')).toBeVisible();
  await expect(legend.getByText('Baseline')).toBeVisible();

  const plot = chart.getByRole('group', { name: 'Remaining balance' });
  await plot.focus();
  await page.keyboard.press('ArrowRight');
  await expect(chart.locator('[aria-live="polite"]')).toContainText('$');

  await fillNumberField(page, 'Loan amount', '0');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('chart-balance')).toHaveCount(0);
});

// quickstart.md §4: principal vs. interest (User Story 2 / FR-002).
test('principal vs interest chart', async ({ page }) => {
  await page.goto('/amortization');

  const chart = page.getByTestId('chart-principal-interest');
  await expect(chart).toBeVisible();
  await expect(
    chart.getByRole('heading', { name: 'Principal vs. interest by year' }),
  ).toBeVisible();
  const legend = chart.getByRole('list', { name: 'Legend' });
  await expect(legend.getByText('Principal', { exact: true })).toBeVisible();
  await expect(legend.getByText('Interest', { exact: true })).toBeVisible();
  await expect(legend.getByText('Extra principal')).toHaveCount(0);

  await fillNumberField(page, 'Amount', '200');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(legend.getByText('Extra principal')).toBeVisible();
});

// quickstart.md §5: payment composition (User Story 3 / FR-003).
test('payment composition', async ({ page }) => {
  await page.goto('/amortization');

  // Principal & interest only → no chart.
  await expect(page.getByTestId('chart-balance')).toBeVisible();
  await expect(page.getByTestId('chart-payment-composition')).toHaveCount(0);

  await fillNumberField(page, 'Annual property tax', '3600');
  await fillNumberField(page, "Annual homeowner's insurance", '1200');
  await fillNumberField(page, 'Monthly HOA fee', '50');
  await page.keyboard.press('Tab');

  const chart = page.getByTestId('chart-payment-composition');
  await expect(chart).toBeVisible();
  const legend = chart.getByRole('list', { name: 'Legend' });
  for (const label of [
    'Principal & interest',
    'Property tax',
    'Insurance',
    'HOA',
  ]) {
    await expect(legend.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(legend.getByText('$300.00')).toBeVisible();
  await expect(legend.getByText('$100.00')).toBeVisible();
});

/** The R3 loan from the plan, with a rental: $330k price, 10% ($33k) down, $2,800 rent, $6k closing. */
async function enterRental(page: import('@playwright/test').Page) {
  await page.goto('/deal-analyzer');
  await fillNumberField(page, 'Home price', '330000');
  // Down payment defaults to percent mode: 10% of $330k = $33,000.
  await fillNumberField(page, 'Down payment', '10');
  await fillNumberField(page, 'Annual property tax', '3600');
  await fillNumberField(page, "Annual homeowner's insurance", '1200');
  await fillNumberField(page, 'Monthly rent', '2800');
  await page.keyboard.press('Tab');
  await fillNumberField(page, 'Closing costs', '6000');
  await page.keyboard.press('Tab');
}

// quickstart.md §7: rental charts (User Story 6 / FR-011, FR-013, FR-014).
test('rental charts', async ({ page }) => {
  await enterRental(page);

  for (const id of [
    'chart-rental-cash-flow',
    'chart-equity',
    'chart-cash-on-cash',
  ]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  const cashFlowLegend = page
    .getByTestId('chart-rental-cash-flow')
    .getByRole('list', { name: 'Legend' });
  await expect(cashFlowLegend.getByText('NOI', { exact: true })).toBeVisible();
  await expect(cashFlowLegend.getByText('Debt service')).toBeVisible();
  await expect(cashFlowLegend.getByText('Cash flow')).toBeVisible();
  // 0% growth → no appreciation segment yet.
  const equityLegend = page
    .getByTestId('chart-equity')
    .getByRole('list', { name: 'Legend' });
  await expect(equityLegend.getByText('Appreciation')).toHaveCount(0);

  await fillNumberField(page, 'Appreciation', '3');
  await page.keyboard.press('Tab');
  await expect(equityLegend.getByText('Appreciation')).toBeVisible();

  await fillNumberField(page, 'Rent growth', '3');
  await page.keyboard.press('Tab');
  await page.reload();
  await expect(
    page.getByRole('textbox', { name: 'Rent growth', exact: true }),
  ).toHaveValue('3');

  // Out of range: the validation message shows (no silent clamping) and only rental charts hide.
  await fillNumberField(page, 'Rent growth', '30');
  await page.keyboard.press('Tab');
  await expect(
    page.getByText('Rent growth must be between -10% and 25%.'),
  ).toBeVisible();
  await expect(page.getByTestId('chart-rental-cash-flow')).toHaveCount(0);
  // Rental errors never block the loan (spec 002 FR-015): the loan fields keep their values.
  await expect(await dealField(page, 'Home price')).toHaveValue('$330,000.00');
  await closeDealSheet(page);

  await fillNumberField(page, 'Rent growth', '3');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('chart-rental-cash-flow')).toBeVisible();

  await (
    await openDealSheet(page)
  )
    .getByRole('button', { name: 'Remove rental analysis' })
    .click();
  await closeDealSheet(page);
  for (const id of [
    'chart-rental-cash-flow',
    'chart-equity',
    'chart-cash-on-cash',
  ]) {
    await expect(page.getByTestId(id)).toHaveCount(0);
  }
});

// FR-013: a rental saved before the growth inputs existed loads with 0% growth.
test('rental charts – old session', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const scenario = {
      id: 'old',
      name: 'Old rental',
      principal: 297000,
      annualInterestRatePct: 6.5,
      termMonths: 360,
      startDate: '2027-01-01',
      paymentFrequency: 'monthly',
      homePrice: 330000,
      downPayment: { amount: 33000 },
      annualPropertyTax: 3600,
      annualInsurance: 1200,
      pmiAnnualRatePct: null,
      monthlyHoa: null,
      extraPayments: [],
      principalIsOverridden: false,
      rental: {
        grossMonthlyRent: 2800,
        otherMonthlyIncome: 0,
        vacancyPct: 5,
        managementPct: 8,
        maintenanceReservePct: 5,
        capexReservePct: 5,
        closingCosts: 6000,
        rehabBudget: 0,
      },
    };
    sessionStorage.setItem(
      'amortization:scenarios',
      JSON.stringify({ scenarios: [scenario], activeScenarioId: 'old' }),
    );
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/deal-analyzer');
  await expect(page.getByRole('tab', { name: /Old rental/ })).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Rent growth', exact: true }),
  ).toHaveValue('0');
  await expect(page.getByTestId('chart-rental-cash-flow')).toBeVisible();
  expect(errors).toEqual([]);
});

// quickstart.md §6: scenario comparison (User Story 4 / FR-004). A line's color is its scenario's
// position in the list, never its rank among the valid scenarios.
test('scenario balance chart', async ({ page }) => {
  await page.goto('/amortization');
  await expect(page.getByTestId('chart-balance')).toBeVisible();
  await expect(page.getByTestId('chart-scenario-balance')).toHaveCount(0);

  await page.getByRole('button', { name: 'Add scenario', exact: true }).click();
  await fillNumberField(page, 'Annual interest rate', '5.75');
  await page.keyboard.press('Tab');

  const chart = page.getByTestId('chart-scenario-balance');
  await expect(chart).toBeVisible();
  const items = chart
    .getByRole('list', { name: 'Legend' })
    .getByRole('listitem');
  await expect(items).toHaveCount(2);
  await expect(items.first()).toHaveText('Scenario 1');

  await page.getByRole('button', { name: 'Add scenario', exact: true }).click();
  await expect(items).toHaveCount(3);
  const swatchColor = (i: number) =>
    items
      .nth(i)
      .locator('[data-swatch]')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
  const [firstColor, thirdColor] = [await swatchColor(0), await swatchColor(2)];
  const [secondName, thirdName] = (await items.allInnerTexts())
    .slice(1)
    .map((t) => t.trim());

  // Make the second scenario invalid: it drops out, and the others keep their colors.
  await page.getByRole('tab', { name: secondName, exact: true }).click();
  await fillNumberField(page, 'Loan amount', '0');
  await page.keyboard.press('Tab');
  await expect(items).toHaveCount(2);
  await expect(items.nth(1)).toHaveText(thirdName);
  expect(await swatchColor(0)).toBe(firstColor);
  expect(await swatchColor(1)).toBe(thirdColor);
});

// Edge case: narrow viewport (≤ 375px) — no horizontal page scroll, every chart visible.
test('charts at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });

  await enterRental(page);
  for (const id of [
    'chart-rental-cash-flow',
    'chart-equity',
    'chart-cash-on-cash',
  ]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);

  // The same scenario on the calculator page (scenarios are shared between pages).
  await page.goto('/amortization');
  for (const id of [
    'chart-payment-composition',
    'chart-balance',
    'chart-principal-interest',
  ]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});

// SC-002: with the charts on the page, a rate change still re-renders within the 1-second budget.
test('charts re-render within 1 second of an input change', async ({
  page,
}) => {
  await page.goto('/amortization');
  await fillNumberField(page, 'Amount', '200');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const balancePath = page
    .getByTestId('chart-balance')
    .locator('path[data-series="balance"]');
  await expect(balancePath).toBeVisible();
  const before = String(await balancePath.getAttribute('d'));

  // Spec 010: time the recalculation, not the sheet's open animation.
  const rate = await dealField(page, 'Annual interest rate');
  await rate.click();
  await page.keyboard.press('ControlOrMeta+A');
  const start = Date.now();
  await rate.pressSequentially('7');
  await page.keyboard.press('Tab');
  await expect(balancePath).not.toHaveAttribute('d', before);
  expect(Date.now() - start).toBeLessThan(1000);
  await closeDealSheet(page);
});
