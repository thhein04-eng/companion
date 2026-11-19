import { expect, test } from '@playwright/test';
import {
  closeDealSheet,
  dealField,
  fillNumberField,
  skipSetupFor,
} from './helpers';

// Spec 010 US3: these specs test other stories, so first-run setup never opens.
test.beforeEach(async ({ page }) => {
  await skipSetupFor(page);
});

// SC-005: a 360-period schedule stays responsive to input changes (<1s).
// 004: rendered with "All" rows per page so every row is still measured.
test('recalculates and re-renders a 360-period schedule in under 1 second', async ({
  page,
}) => {
  await page.goto('/amortization');
  await page.getByRole('combobox', { name: 'Rows per page' }).click();
  await page.getByRole('option', { name: 'All', exact: true }).click();
  await expect(page.locator('table').last().locator('tbody tr')).toHaveCount(
    360,
  );

  // Spec 010: time the recalculation, not the sheet's open animation.
  const field = await dealField(page, 'Annual interest rate');
  await field.click();
  await page.keyboard.press('ControlOrMeta+A');
  const start = Date.now();
  await field.pressSequentially('7');
  await page.keyboard.press('Tab');
  await expect(
    page.getByText('$1,995', { exact: false }).first(),
  ).toBeVisible();
  expect(Date.now() - start).toBeLessThan(1000);
  await closeDealSheet(page);
});

// 004 SC-002 / 001 SC-005 at the default page size (12 rows per page).
test('recalculates a paginated schedule in under 1 second', async ({
  page,
}) => {
  await page.goto('/amortization');
  await expect(page.getByText('Payments 1–12 of 360')).toBeVisible();

  // Spec 010: time the recalculation, not the sheet's open animation.
  const field = await dealField(page, 'Annual interest rate');
  await field.click();
  await page.keyboard.press('ControlOrMeta+A');
  const start = Date.now();
  await field.pressSequentially('7');
  await page.keyboard.press('Tab');
  await expect(
    page.getByText('$1,995', { exact: false }).first(),
  ).toBeVisible();
  expect(Date.now() - start).toBeLessThan(1000);
  await closeDealSheet(page);
});

// SC-003: Deal Analyzer badges reflect an input change within 1 second.
test('updates the Cash-on-Cash badge within 1 second of a rent change', async ({
  page,
}) => {
  await page.goto('/deal-analyzer');
  await fillNumberField(page, 'Home price', '250000');
  await fillNumberField(page, 'Down payment', '25'); // percent mode: $62,500
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Annual property tax', '3000');
  await fillNumberField(page, "Annual homeowner's insurance", '1200');
  await fillNumberField(page, 'Monthly rent', '2400');
  await page.keyboard.press('Tab');
  await fillNumberField(page, 'Closing costs', '7500');
  await fillNumberField(page, 'Rehab budget', '10000');
  await page.keyboard.press('Tab');

  const coc = page.getByTestId('badge-cash-on-cash');
  await expect(coc).toContainText('3.8%');

  // Spec 010: time the recalculation, not the sheet's open animation.
  const field = await dealField(page, 'Monthly rent');
  await field.click();
  await page.keyboard.press('ControlOrMeta+A');
  const start = Date.now();
  await field.pressSequentially('2000');
  await page.keyboard.press('Tab');
  await expect(coc).toContainText(/-\d+\.\d%/, { timeout: 1000 });
  expect(Date.now() - start).toBeLessThan(1000);
  await closeDealSheet(page);
});

// Spec 006 SC-003: the financing matrix reflects a toggle change within 100 ms.
// Measured inside the page (click → DOM update), so Playwright's own
// round-trips don't count against the budget.
test('switches the financing matrix structure within 100 ms', async ({
  page,
}) => {
  await page.goto('/financing');
  await fillNumberField(page, 'Home price', '400000');
  await fillNumberField(page, 'Down payment', '25');
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Monthly rent', '3800');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('financing-matrix')).toBeVisible();

  const elapsed = await page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const target = document.querySelector(
          '[data-testid="financing-col-arm"]',
        );
        const radio = Array.from(
          document.querySelectorAll(
            '[data-testid="financing-toggle"] [role="radio"]',
          ),
        ).find((el) => el.textContent?.trim() === 'ARM') as
          HTMLElement | undefined;
        if (!target || !radio) {
          reject(new Error('financing matrix not rendered'));
          return;
        }
        let start = 0;
        const observer = new MutationObserver(() => {
          if (target.getAttribute('aria-current') === 'true') {
            observer.disconnect();
            resolve(performance.now() - start);
          }
        });
        observer.observe(target, { attributes: true });
        start = performance.now();
        radio.click();
      }),
  );
  expect(elapsed).toBeLessThan(100);
});

// Spec 008 SC-003: the wealth projection reflects a driver change within 1 second.
test('updates the wealth projection within 1 second of a growth change', async ({
  page,
}) => {
  await page.goto('/wealth');
  await fillNumberField(page, 'Home price', '400000');
  await fillNumberField(page, 'Down payment', '25');
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Annual property tax', '4800');
  await fillNumberField(page, "Annual homeowner's insurance", '1800');
  await fillNumberField(page, 'Monthly rent', '3800');
  await page.keyboard.press('Tab');
  const netWorth = page.getByTestId('wealth-net-worth');
  await expect(netWorth).toBeVisible();
  const before = await netWorth.innerText();

  const start = Date.now();
  await fillNumberField(page, 'Rent growth', '2.5');
  await page.keyboard.press('Tab');
  await expect(netWorth).not.toHaveText(before, { timeout: 1000 });
  expect(Date.now() - start).toBeLessThan(1000);
});

// Spec 009 SC-003: the exit reflects a growth change within 1 second.
test('updates the exit IRR within 1 second of a growth change', async ({
  page,
}) => {
  await page.goto('/pro-forma');
  await fillNumberField(page, 'Home price', '400000');
  await fillNumberField(page, 'Down payment', '25');
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Annual property tax', '4800');
  await fillNumberField(page, "Annual homeowner's insurance", '1800');
  await fillNumberField(page, 'Monthly rent', '3800');
  await page.getByTestId('pro-forma-example-rates').click();
  const irr = page.getByTestId('exit-irr');
  await expect(irr).toContainText('15.66%');

  const start = Date.now();
  await fillNumberField(page, 'Rent growth', '5');
  await page.keyboard.press('Tab');
  await expect(irr).not.toContainText('15.66%', { timeout: 1000 });
  expect(Date.now() - start).toBeLessThan(1000);
});

// Spec 013 SC-003: the sale profit reflects an exit change within 1 second.
test('updates the sale profit within 1 second of an exit change', async ({
  page,
}) => {
  await page.goto('/sale');
  await fillNumberField(page, 'Home price', '400000');
  await fillNumberField(page, 'Down payment', '25');
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Annual property tax', '4800');
  await fillNumberField(page, "Annual homeowner's insurance", '1800');
  await fillNumberField(page, 'Monthly rent', '3800');
  await fillNumberField(page, 'Rent growth', '3');
  await fillNumberField(page, 'Expense growth', '2.5');
  await fillNumberField(page, 'Appreciation', '3.5');
  await page.keyboard.press('Tab');
  const profit = page.getByTestId('sale-profit').locator('td');
  await expect(profit).toHaveText('$151,420.55');

  const start = Date.now();
  await fillNumberField(page, 'Sell after', '8');
  await page.keyboard.press('Tab');
  await expect(profit).not.toHaveText('$151,420.55', { timeout: 1000 });
  expect(Date.now() - start).toBeLessThan(1000);
});
