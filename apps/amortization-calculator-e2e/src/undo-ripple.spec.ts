import { expect, test, type Page } from '@playwright/test';
import { closeDealSheet, fillDealField, skipSetupFor } from './helpers';

const strip = (page: Page) => page.getByRole('region', { name: 'Deal' });

/** Spec 002's reference deal, entered through the sheet, then the toast is cleared. */
async function enterDeal(page: Page) {
  await fillDealField(page, 'Home price', '250000');
  await fillDealField(page, 'Down payment', '25');
  await fillDealField(page, 'Annual interest rate', '7');
  await fillDealField(page, 'Annual property tax', '3000');
  await fillDealField(page, "Annual homeowner's insurance", '1200');
  await fillDealField(page, 'Monthly rent', '3200');
  await page.keyboard.press('Tab');
  await closeDealSheet(page);
}

async function changeRentByChip(page: Page, value: string) {
  await strip(page).getByRole('button', { name: /^Rent/ }).click();
  const input = page
    .getByRole('dialog', { name: /Edit Rent/ })
    .getByRole('textbox', { name: 'Monthly rent', exact: true });
  await input.click();
  await page.keyboard.press('ControlOrMeta+A');
  await input.pressSequentially(value);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
}

const toast = (page: Page) =>
  page.getByRole('region', { name: /Notifications/ }).getByText(/changed/);

test.describe('Change ripple and undo (spec 010 US6)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  test('a rent change highlights the figures and offers Undo', async ({
    page,
  }) => {
    await page.goto('/deal-analyzer');
    await enterDeal(page);
    const cashFlow = page.getByTestId('row-cash-flow');
    const before = await cashFlow.textContent();

    await changeRentByChip(page, '3500');
    await expect(toast(page)).toHaveText('Rent changed $3,200 → $3,500');
    // The toast sits fully on screen, centered (it once rendered half off the left edge).
    const { left, right, viewport } = await toast(page).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, viewport: window.innerWidth };
    });
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(viewport);
    await expect(cashFlow.locator('[data-rippling="true"]')).toHaveCount(1);
    await expect(
      page.getByTestId('badge-cash-on-cash').locator('[data-rippling="true"]'),
    ).toHaveCount(1);

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(cashFlow).toHaveText(before ?? '');
    await expect(
      strip(page).getByRole('button', { name: /^Rent/ }),
    ).toContainText('$3,200');
  });

  test('the highlight has no transition with reduced motion', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/deal-analyzer');
    await enterDeal(page);
    await changeRentByChip(page, '3500');
    const ripple = page
      .getByTestId('row-cash-flow')
      .locator('[data-rippling="true"]');
    await expect(ripple).toHaveCount(1);
    expect(
      await ripple.evaluate((el) => getComputedStyle(el).transitionDuration),
    ).toBe('0s');
  });

  test('the toast is polite, keyboard reachable, and survives navigation', async ({
    page,
  }) => {
    await page.goto('/deal-analyzer');
    await enterDeal(page);
    await changeRentByChip(page, '3500');
    await expect(toast(page)).toBeVisible();
    // ui-sdk announces toasts through its own polite live region (role="status").
    await expect(
      page.locator('[role="status"][aria-live="polite"]').filter({
        hasText: 'Rent changed',
      }),
    ).toHaveCount(1);
    await page.getByRole('button', { name: 'Undo' }).focus();
    await expect(page.getByRole('button', { name: 'Undo' })).toBeFocused();
    await page.keyboard.press('Escape');

    await changeRentByChip(page, '3600');
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'DSCR & Financing' })
      .click();
    await expect(toast(page)).toBeVisible();
    await expect(toast(page)).toBeHidden({ timeout: 8000 });
  });
});
