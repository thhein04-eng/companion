import { expect, test, type Page } from '@playwright/test';
import { dealSheet, skipSetupFor } from './helpers';

const ROUTES = [
  '/amortization',
  '/deal-analyzer',
  '/financing',
  '/wealth',
  '/pro-forma',
];

const bar = (page: Page) => page.getByTestId('deal-strip');
const editDeal = (page: Page) =>
  bar(page).getByRole('button', { name: 'Edit deal', exact: true });

async function box(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
}

test.describe('Deal card (spec 011 US1)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  test('sits above every page title as a card aligned with it, the same on every page', async ({
    page,
  }) => {
    const tops: number[] = [];
    const orders: string[] = [];
    for (const route of ROUTES) {
      await page.goto(route);
      const b = await box(page, '[data-testid="deal-strip"]');
      const h1 = await box(page, '#main-content h1');
      expect(b.y, route).toBeLessThan(h1.y);
      expect(Math.abs(b.x - h1.x), route).toBeLessThanOrEqual(1);
      tops.push(Math.round(b.y));
      orders.push(
        (
          await bar(page)
            .locator('[data-testid="deal-chips"] [data-chip]')
            .evaluateAll((els) => els.map((el) => el.getAttribute('data-chip')))
        ).join(','),
      );
    }
    expect(new Set(tops).size).toBe(1);
    expect(new Set(orders).size).toBe(1);
    expect(orders[0]).toBe(
      'homePrice,downPayment,principal,annualInterestRatePct,termMonths,rental.grossMonthlyRent',
    );
  });

  test('values are labeled cells, with the monthly payment on its own row', async ({
    page,
  }) => {
    await page.goto('/financing');
    const rate = bar(page).locator('[data-chip="annualInterestRatePct"]');
    await expect(rate).toContainText('Rate');
    await expect(rate).toContainText('6.5%');
    await expect(rate).toHaveAttribute('data-tone', 'pin');
    const total = bar(page).locator('[data-chip="total"]');
    await expect(total).toContainText('Monthly payment');
    const r = await box(page, '[data-chip="annualInterestRatePct"]');
    const t = await box(page, '[data-chip="total"]');
    expect(t.y).toBeGreaterThan(r.y);
  });

  test('Edit deal is a labeled primary button on the right', async ({
    page,
  }) => {
    await page.goto('/financing');
    const button = editDeal(page);
    await expect(button).toBeVisible();
    await expect(button.locator('svg')).toHaveCount(1);
    await expect(button).toHaveText('Edit deal');
    const b = await box(page, '[data-testid="deal-strip"]');
    const e = await box(page, '[data-testid="edit-deal"]');
    expect(e.x + e.width / 2).toBeGreaterThan(b.x + b.width / 2);
  });

  test('stays at the top while the page scrolls', async ({ page }) => {
    await page.goto('/amortization');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const b = await box(page, '[data-testid="deal-strip"]');
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeLessThan(80);
  });

  test('on a phone it sits under the mobile header, with Edit deal visible', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/deal-analyzer');
    const b = await box(page, '[data-testid="deal-strip"]');
    expect(b.y).toBeGreaterThanOrEqual(55);
    await expect(editDeal(page)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  });

  for (const size of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    test(`focus order matches the screen at ${size.width}px: tabs → Edit deal → chips`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await page.goto('/financing');
      const order = await page.evaluate(() => {
        const strip = document.querySelector(
          '[data-testid="deal-strip"]',
        ) as HTMLElement;
        const focusables = Array.from(
          strip.querySelectorAll<HTMLElement>(
            'button, [role="tab"], [tabindex="0"]',
          ),
        ).filter((el) => el.offsetParent !== null);
        const index = (pred: (el: HTMLElement) => boolean) =>
          focusables.findIndex(pred);
        return {
          tab: index((el) => el.getAttribute('role') === 'tab'),
          edit: index((el) => el.dataset.testid === 'edit-deal'),
          chip: index((el) => el.hasAttribute('data-chip')),
        };
      });
      expect(order.tab).toBeLessThan(order.edit);
      expect(order.edit).toBeLessThan(order.chip);
    });
  }

  test('on a phone Edit deal shows above the chips, matching focus order', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/financing');
    const e = await box(page, '[data-testid="edit-deal"]');
    const c = await box(page, '[data-chip]');
    expect(e.y).toBeLessThan(c.y);
  });

  test('closing the sheet returns focus to Edit deal', async ({ page }) => {
    await page.goto('/wealth');
    await editDeal(page).click();
    await expect(dealSheet(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dealSheet(page)).toBeHidden();
    await expect(editDeal(page)).toBeFocused();
  });
});
