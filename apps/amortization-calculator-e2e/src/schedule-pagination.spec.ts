import { expect, type Page, test } from '@playwright/test';
import { clearNumberField, fillNumberField } from './helpers';

// specs/004-amortization-schedule-pagination — quickstart.md scenarios 1–8.

const rows = (page: Page) =>
  page
    .getByRole('region', { name: 'Amortization schedule' })
    .locator('tbody tr');
const pager = (page: Page) =>
  page.getByRole('navigation', { name: 'Schedule pages' });
const step = (
  page: Page,
  name: 'First page' | 'Previous page' | 'Next page' | 'Last page',
) => pager(page).getByRole('button', { name, exact: true });
const pageLink = (page: Page, n: number) =>
  pager(page).getByRole('button', { name: String(n), exact: true });
const range = (page: Page) =>
  page.getByText(/^Payments \d[\d,]*–\d[\d,]* of \d[\d,]*$/);

async function chooseRowsPerPage(page: Page, option: string) {
  await page.getByRole('combobox', { name: 'Rows per page' }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function goToPage(page: Page, target: number) {
  await fillNumberField(page, 'Go to year', String(target));
  await page.keyboard.press('Tab');
}

test.describe('browse page by page (US1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/amortization');
    await expect(range(page)).toHaveText('Payments 1–12 of 360');
  });

  test('(a) first page shows 12 rows with First/Previous disabled', async ({
    page,
  }) => {
    await expect(rows(page)).toHaveCount(12);
    await expect(rows(page).first().locator('td').first()).toHaveText('1');
    await expect(step(page, 'First page')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(step(page, 'Previous page')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(pageLink(page, 30)).toBeVisible();
  });

  test('(b) Next shows payments 13–24', async ({ page }) => {
    await step(page, 'Next page').click();
    await expect(range(page)).toHaveText('Payments 13–24 of 360');
    await expect(rows(page).first().locator('td').first()).toHaveText('13');
    await expect(rows(page).last().locator('td').first()).toHaveText('24');
  });

  test('(c) Last shows payments 349–360 ending at $0.00', async ({ page }) => {
    await step(page, 'Last page').click();
    await expect(range(page)).toHaveText('Payments 349–360 of 360');
    await expect(rows(page).last()).toContainText('$0.00');
    await expect(step(page, 'Next page')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(step(page, 'Last page')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  test('(d) keyboard only: Enter on Next twice keeps focus on Next', async ({
    page,
  }) => {
    await step(page, 'Next page').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(range(page)).toHaveText('Payments 25–36 of 360');
    await expect(step(page, 'Next page')).toBeFocused();
  });

  test('(e) page link 30 is the last page and is marked current', async ({
    page,
  }) => {
    await pageLink(page, 30).click();
    await expect(range(page)).toHaveText('Payments 349–360 of 360');
    await expect(pageLink(page, 30)).toHaveAttribute('aria-current', 'page');
  });

  test('(f) a page change updates within 250 ms (SC-002)', async ({ page }) => {
    // Timed in the browser (click → range text changes) so Playwright's own
    // actionability/polling overhead doesn't count against the budget.
    const next = await step(page, 'Next page').elementHandle();
    const elapsed = await page.evaluate(
      (button) =>
        new Promise<number>((resolve) => {
          const label = [...document.querySelectorAll('p')].find((p) =>
            p.textContent?.startsWith('Payments '),
          ) as HTMLElement;
          const start = performance.now();
          new MutationObserver((_, observer) => {
            if (label.textContent?.includes('13–24')) {
              observer.disconnect();
              resolve(performance.now() - start);
            }
          }).observe(label, {
            childList: true,
            characterData: true,
            subtree: true,
          });
          (button as HTMLElement).click();
        }),
      next,
    );
    await expect(range(page)).toHaveText('Payments 13–24 of 360');
    expect(elapsed).toBeLessThan(250);
  });

  test('(g) a one-page schedule disables every step', async ({ page }) => {
    await fillNumberField(page, 'Loan term', '1');
    await page.keyboard.press('Tab');
    await expect(range(page)).toHaveText('Payments 1–12 of 12');
    await expect(rows(page)).toHaveCount(12);
    for (const name of [
      'First page',
      'Previous page',
      'Next page',
      'Last page',
    ] as const) {
      await expect(step(page, name)).toHaveAttribute('aria-disabled', 'true');
    }
  });
});

test.describe('rows per page (US2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/amortization');
    await expect(range(page)).toHaveText('Payments 1–12 of 360');
  });

  test('(a) switching to 60 keeps the first visible row in view', async ({
    page,
  }) => {
    await pageLink(page, 3).click();
    await expect(range(page)).toHaveText('Payments 25–36 of 360');
    await chooseRowsPerPage(page, '60');
    await expect(range(page)).toHaveText('Payments 1–60 of 360');
    await expect(rows(page)).toHaveCount(60);
  });

  test('(b) switching to 24 from page 10 shows payments 97–120', async ({
    page,
  }) => {
    await goToPage(page, 10);
    await expect(range(page)).toHaveText('Payments 109–120 of 360');
    await chooseRowsPerPage(page, '24');
    await expect(range(page)).toHaveText('Payments 97–120 of 360');
  });

  test('(c, d) All shows every row and hides the pager; 12 brings it back', async ({
    page,
  }) => {
    await chooseRowsPerPage(page, 'All');
    await expect(rows(page)).toHaveCount(360);
    await expect(range(page)).toHaveText('Payments 1–360 of 360');
    await expect(pager(page)).toHaveCount(0);

    await chooseRowsPerPage(page, '12');
    await expect(rows(page)).toHaveCount(12);
    await expect(pager(page)).toBeVisible();
  });

  test('(e) Go to year jumps to that year in one interaction (SC-001)', async ({
    page,
  }) => {
    await fillNumberField(page, 'Go to year', '15');
    await page.keyboard.press('Tab');
    await expect(range(page)).toHaveText('Payments 169–180 of 360');

    await chooseRowsPerPage(page, 'All');
    await expect(
      page.getByRole('textbox', { name: 'Go to year', exact: true }),
    ).toHaveCount(0);
  });
});

test.describe('page survives recalculation (US3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/amortization');
    await expect(range(page)).toHaveText('Payments 1–12 of 360');
  });

  test('(a) changing the rate keeps the current page', async ({ page }) => {
    await goToPage(page, 10);
    await expect(range(page)).toHaveText('Payments 109–120 of 360');
    await fillNumberField(page, 'Annual interest rate', '7');
    await page.keyboard.press('Tab');
    await expect(rows(page).first()).toContainText('$1,995');
    await expect(range(page)).toHaveText('Payments 109–120 of 360');
  });

  test('(b) a shorter schedule moves to its new last page', async ({
    page,
  }) => {
    await step(page, 'Last page').click();
    for (let i = 0; i < 5; i += 1) await step(page, 'Previous page').click();
    await expect(range(page)).toHaveText('Payments 289–300 of 360');

    await fillNumberField(page, 'Amount', '1000');
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    await expect(range(page)).not.toHaveText(/of 360$/);
    const total = Number(
      (await range(page).textContent())?.match(/of (\d+)$/)?.[1],
    );
    expect(total).toBeLessThan(300);
    await expect(step(page, 'Last page')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  test('(c) the page survives invalid input', async ({ page }) => {
    await goToPage(page, 5);
    await expect(range(page)).toHaveText('Payments 49–60 of 360');
    await clearNumberField(page, 'Loan amount');
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('region', { name: 'Amortization schedule' }),
    ).toHaveCount(0);

    await fillNumberField(page, 'Loan amount', '300000');
    await page.keyboard.press('Tab');
    await expect(range(page)).toHaveText('Payments 49–60 of 360');
  });

  test('(d) switching scenarios resets to page 1 and keeps the page size', async ({
    page,
  }) => {
    await chooseRowsPerPage(page, '24');
    await pageLink(page, 5).click();
    await expect(range(page)).toHaveText('Payments 97–120 of 360');

    await page.getByRole('button', { name: '+ Add scenario' }).click();
    await expect(range(page)).toHaveText(/^Payments 1–24 of /);
  });
});
