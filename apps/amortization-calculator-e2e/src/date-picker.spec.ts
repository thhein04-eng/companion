import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  closeDealSheet,
  dealSheet,
  openDealSheet,
  setTheme,
  skipSetupFor,
} from './helpers';

const calendar = (page: Page) => page.getByTestId('date-calendar');
const firstPaymentInput = (page: Page) =>
  dealSheet(page).getByRole('group', { name: 'First payment date' });

async function openFirstPaymentCalendar(page: Page) {
  const sheet = await openDealSheet(page);
  await sheet
    .getByRole('button', { name: 'Choose date for First payment date' })
    .click();
  await expect(calendar(page)).toBeVisible();
}

const selectedDate = (page: Page) =>
  calendar(page).locator('[data-selected]').getAttribute('data-value');

test.describe('Date picker (spec 011 US4)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  test('picking a day by mouse sets the date and recalculates', async ({
    page,
  }) => {
    await page.goto('/amortization');
    await openFirstPaymentCalendar(page);
    const month = String(await selectedDate(page)).slice(0, 7);
    await calendar(page).locator(`[data-value="${month}-15"]`).click();
    await expect(calendar(page)).toBeHidden();
    await expect(firstPaymentInput(page)).toBeVisible();
    await openFirstPaymentCalendar(page);
    expect(await selectedDate(page)).toBe(`${month}-15`);
    await page.keyboard.press('Escape');
    await closeDealSheet(page);
    const firstRow = page.locator('table').last().locator('tbody tr').first();
    await expect(firstRow).toContainText('15');
  });

  test('works by keyboard: arrows, Page Down, Home/End and Enter', async ({
    page,
  }) => {
    await page.goto('/amortization');
    await openFirstPaymentCalendar(page);
    const start = String(await selectedDate(page));
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('PageDown');
    const focused = () =>
      page.evaluate(() =>
        document.activeElement
          ?.closest('[data-value]')
          ?.getAttribute('data-value'),
      );
    const moved = String(await focused());
    expect(moved > start).toBe(true);
    await page.keyboard.press('Home');
    const weekStart = String(await focused());
    await page.keyboard.press('End');
    const weekEnd = String(await focused());
    expect(weekEnd > weekStart).toBe(true);
    await page.keyboard.press('Enter');
    await expect(calendar(page)).toBeHidden();
    await openFirstPaymentCalendar(page);
    expect(await selectedDate(page)).toBe(weekEnd);
  });

  test('Escape closes the calendar first, then the sheet', async ({ page }) => {
    await page.goto('/amortization');
    await openFirstPaymentCalendar(page);
    await page.keyboard.press('Escape');
    await expect(calendar(page)).toBeHidden();
    await expect(dealSheet(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dealSheet(page)).toBeHidden();
  });

  test('the one-time extra payment date also has a calendar', async ({
    page,
  }) => {
    await page.goto('/amortization');
    const form = page.getByRole('form', { name: 'Add an extra payment' });
    await form.getByRole('radio', { name: 'One-time' }).click();
    await form.getByRole('button', { name: 'Choose date for Date' }).click();
    await expect(calendar(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(calendar(page)).toBeHidden();
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`the open calendar has no accessibility violations in ${theme}`, async ({
      page,
    }) => {
      await page.goto('/amortization');
      await setTheme(page, theme);
      await openFirstPaymentCalendar(page);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      expect(violations).toEqual([]);
    });
  }
});
