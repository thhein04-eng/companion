import { expect, test, type Page } from '@playwright/test';
import {
  closeDealSheet,
  dealSheet,
  fillDealField,
  skipSetupFor,
} from './helpers';

/** The first-run setup sheet: the Edit deal sheet in setup mode (spec 010 US3). */
const setupSheet = (page: Page) =>
  page.getByRole('dialog', { name: 'Welcome, set up this deal' });

const strip = (page: Page) => page.getByRole('region', { name: 'Deal' });

test.describe('First-run setup (spec 010 US3)', () => {
  test('opens by itself for a new deal, with focus inside', async ({
    page,
  }) => {
    await page.goto('/financing');
    const sheet = setupSheet(page);
    await expect(sheet).toBeVisible();
    await expect
      .poll(() => sheet.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);
    await expect(sheet.getByRole('button', { name: 'Done' })).toBeDisabled();
  });

  test('Done finishes setup, focuses the page heading, and does not reopen', async ({
    page,
  }) => {
    await page.goto('/financing');
    const sheet = setupSheet(page);
    await expect(sheet).toBeVisible();
    for (const [label, value] of [
      ['Home price', '450000'],
      ['Down payment', '20'],
    ]) {
      const input = sheet.getByRole('textbox', { name: label, exact: true });
      await input.click();
      await page.keyboard.press('ControlOrMeta+A');
      await input.pressSequentially(value);
    }
    await page.keyboard.press('Tab');
    const done = sheet.getByRole('button', { name: 'Done' });
    await expect(done).toBeEnabled();
    await done.click();
    await expect(sheet).toBeHidden();
    await expect(
      page.getByRole('heading', { level: 1, name: 'DSCR & Financing' }),
    ).toBeFocused();
    await page.goto('/wealth');
    await expect(strip(page)).toBeVisible();
    await expect(dealSheet(page)).toBeHidden();
  });

  test('Escape skips setup for that scenario', async ({ page }) => {
    await page.goto('/amortization');
    await expect(setupSheet(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(setupSheet(page)).toBeHidden();
    await page.goto('/deal-analyzer');
    await expect(strip(page)).toBeVisible();
    await expect(dealSheet(page)).toBeHidden();
  });

  test('a new scenario with no price gets its own setup', async ({ page }) => {
    await page.goto('/amortization');
    await expect(setupSheet(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(setupSheet(page)).toBeHidden();
    await page
      .getByRole('button', { name: 'Add scenario', exact: true })
      .click();
    // The copy also has no price, so setup opens for it.
    await expect(setupSheet(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await strip(page).getByRole('tab', { name: 'Scenario 1' }).click();
    await expect(dealSheet(page)).toBeHidden();
  });
});

test.describe('Missing inputs and errors (spec 010 US3)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  test('a missing-rent chip opens the sheet at the rent field', async ({
    page,
  }) => {
    await page.goto('/deal-analyzer');
    const chip = strip(page).getByRole('button', {
      name: '+ Add rent to unlock cash flow',
    });
    await expect(chip).toBeVisible();
    await chip.click();
    await expect(dealSheet(page)).toBeVisible();
    await expect(
      dealSheet(page).getByRole('textbox', {
        name: 'Monthly rent',
        exact: true,
      }),
    ).toBeFocused();
  });

  test('an invalid loan amount shows a count, a red chip, and opens the sheet at it', async ({
    page,
  }) => {
    await page.goto('/financing');
    await fillDealField(page, 'Loan amount', '0');
    await page.keyboard.press('Tab');
    await closeDealSheet(page);
    const count = page.getByTestId('deal-error-count');
    await expect(count).toHaveText('1 input needs fixing');
    await expect(
      strip(page).locator('[data-chip="principal"]'),
    ).toHaveAttribute('data-tone', 'err');
    await count.click();
    await expect(
      dealSheet(page).getByRole('textbox', {
        name: 'Loan amount',
        exact: true,
      }),
    ).toBeFocused();
  });

  test('pages name the problem with a Fix inputs button, never "above"', async ({
    page,
  }) => {
    await page.goto('/wealth');
    await fillDealField(page, 'Home price', '450000');
    await fillDealField(page, 'Monthly rent', '3200');
    await fillDealField(page, 'Loan amount', '0');
    await page.keyboard.press('Tab');
    await closeDealSheet(page);
    await expect(page.getByTestId('wealth-na')).toHaveText(
      'Fix the loan inputs to see the projection.',
    );
    await page.getByRole('button', { name: 'Fix inputs' }).click();
    await expect(
      dealSheet(page).getByRole('textbox', {
        name: 'Loan amount',
        exact: true,
      }),
    ).toBeFocused();
    await closeDealSheet(page);
    for (const path of [
      '/amortization',
      '/deal-analyzer',
      '/financing',
      '/wealth',
      '/pro-forma',
      '/sale',
    ]) {
      await page.goto(path);
      await expect(page.locator('main').getByText(/\babove\b/)).toHaveCount(0);
    }
  });
});
