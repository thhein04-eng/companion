import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  closeDealSheet,
  dealSheet,
  fillNumberField,
  openDealSheet,
  setTheme,
  skipSetupFor,
} from './helpers';

const ROUTES = [
  '/amortization',
  '/deal-analyzer',
  '/financing',
  '/wealth',
  '/pro-forma',
  '/sale',
  '/sensitivity',
  '/glossary',
];

async function reference(page: Page) {
  await fillNumberField(page, 'Home price', '450000');
  await fillNumberField(page, 'Down payment', '20');
  await fillNumberField(page, 'Annual property tax', '5400');
  await fillNumberField(page, 'Monthly rent', '3200');
}

const scan = (page: Page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

test.describe('Accessibility (spec 010 SC-005, SC-006)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`every page has no WCAG A/AA violations in ${theme}`, async ({
      page,
    }) => {
      await page.goto('/deal-analyzer');
      await setTheme(page, theme);
      await reference(page);
      for (const route of ROUTES) {
        await page.goto(route);
        const { violations } = await scan(page);
        expect(violations, `${route} ${theme}`).toEqual([]);
      }
    });
  }

  test('the open sheet and an open chip popover have no violations', async ({
    page,
  }) => {
    await page.goto('/financing');
    await reference(page);
    await openDealSheet(page);
    expect((await scan(page)).violations).toEqual([]);
    // Close with Done: in Playwright's Firefox, Escape right after an axe scan crashes the page
    // (axe + Firefox only; Escape alone is covered in deal-strip.spec.ts). See tasks.md notes.
    await closeDealSheet(page);
    await expect(dealSheet(page)).toBeHidden();
    await page
      .getByRole('region', { name: 'Deal' })
      .getByRole('button', { name: /^Rate/ })
      .click();
    await expect(page.getByRole('dialog', { name: /Edit Rate/ })).toBeVisible();
    expect((await scan(page)).violations).toEqual([]);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`a 4-unit house-hack with RUBS has no violations in ${theme} (spec 012 SC-006)`, async ({
      page,
    }) => {
      await page.goto('/deal-analyzer');
      await setTheme(page, theme);
      await reference(page);
      const sheet = await openDealSheet(page);
      for (let i = 0; i < 3; i++) await sheet.getByTestId('add-unit').click();
      await sheet
        .getByRole('group', { name: 'Unit A' })
        .getByRole('checkbox', { name: 'I live here' })
        .check();
      await sheet.getByRole('button', { name: '+ Add expense' }).click();
      // No name is typed: in Playwright's Firefox, an axe scan right after typing into the
      // (pre-spec-012) expense-name input crashes the page (isolated 2026-11-19 by excluding it).
      await sheet
        .getByRole('radiogroup', { name: 'Paid by' })
        .getByRole('radio', { name: 'Tenants (RUBS)' })
        .click();
      expect((await scan(page)).violations).toEqual([]);
      await closeDealSheet(page);
      await expect(page.getByTestId('occupancy-view').first()).toBeVisible();
      expect((await scan(page)).violations).toEqual([]);
    });
  }

  test('the rent roll, owner toggle and view switch work by keyboard alone (spec 012 SC-006)', async ({
    page,
  }) => {
    await page.goto('/deal-analyzer');
    await reference(page);
    const sheet = await openDealSheet(page);
    await sheet.getByTestId('add-unit').focus();
    await page.keyboard.press('Enter');
    await expect(sheet.getByTestId('rent-unit')).toHaveCount(2);
    const mine = sheet
      .getByRole('group', { name: 'Unit A' })
      .getByRole('checkbox', { name: 'I live here' });
    await mine.focus();
    await page.keyboard.press('Space');
    await expect(mine).toBeChecked();
    await closeDealSheet(page);
    const living = page
      .getByRole('region', { name: 'Deal' })
      .getByRole('radio', { name: 'Living there' });
    await living.focus();
    await page.keyboard.press('ArrowRight');
    await expect(
      page
        .getByRole('region', { name: 'Deal' })
        .getByRole('radio', { name: 'After move-out' }),
    ).toBeChecked();
  });
});

/**
 * The Sensitivity page (spec 015 SC-005). One scan per test: in Playwright's Firefox, touching the
 * page after an axe scan crashes it (the same limit noted for the Escape key above).
 */
async function sensitivityPage(page: Page, theme: 'light' | 'dark') {
  // Scan the final colors, not a frame of the 150 ms fade a segmented control plays when it is
  // clicked (the app honors reduced motion).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/sensitivity');
  await setTheme(page, theme);
  // A thin rent, so the grid has negative cells as well as cells below a target.
  await fillNumberField(page, 'Home price', '250000');
  await fillNumberField(page, 'Down payment', '25');
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Annual property tax', '3000');
  await fillNumberField(page, "Annual homeowner's insurance", '1200');
  await fillNumberField(page, 'Monthly rent', '1500');
  await page.keyboard.press('Tab');
  await closeDealSheet(page);
}

/**
 * A scan that leaves out the target's text input. In Playwright's Firefox, scanning a page whose
 * text input has just been typed into crashes the page (also seen with the expense-name input,
 * spec 012); the untouched field is still scanned by the first test below in every browser.
 */
const scanWithoutTypedTarget = (page: Page) =>
  new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('[data-testid="target-value"] input')
    .analyze();

async function typeTarget(page: Page, value: string) {
  const target = page.getByRole('textbox', { name: 'At least', exact: true });
  await target.click();
  await page.keyboard.press('ControlOrMeta+A');
  await target.pressSequentially(value);
  await page.keyboard.press('Tab');
}

test.describe('Sensitivity page accessibility (spec 015 SC-005)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`the grid with negative cells and the default offer have no violations in ${theme}`, async ({
      page,
    }) => {
      await sensitivityPage(page, theme);
      await expect(
        page
          .locator('[data-testid="sensitivity-cell"][data-state="negative"]')
          .first(),
      ).toBeVisible();
      expect((await scan(page)).violations).toEqual([]);
    });

    test(`a set target with ▼ cells and a found offer have no violations in ${theme}`, async ({
      page,
    }) => {
      await sensitivityPage(page, theme);
      await typeTarget(page, '100');
      await expect(page.getByTestId('max-offer-price')).toBeVisible();
      await expect(
        page
          .locator(
            '[data-testid="sensitivity-cell"][data-state="below-target"]',
          )
          .first(),
      ).toBeVisible();
      expect((await scanWithoutTypedTarget(page)).violations).toEqual([]);
    });

    test(`Cash-on-Cash by rent with a tagged offer column has no violations in ${theme}`, async ({
      page,
    }) => {
      await sensitivityPage(page, theme);
      await page
        .getByTestId('sensitivity-measure')
        .getByRole('radio', { name: 'Cash-on-Cash' })
        .click();
      await page
        .getByTestId('sensitivity-vary')
        .getByRole('radio', { name: 'Rent' })
        .click();
      await expect(page.getByTestId('sensitivity-cell')).toHaveCount(25);
      expect((await scan(page)).violations).toEqual([]);
    });

    test(`an unreachable target has no violations in ${theme}`, async ({
      page,
    }) => {
      await sensitivityPage(page, theme);
      await typeTarget(page, '5000');
      await expect(page.getByTestId('max-offer-unreachable')).toBeVisible();
      expect((await scanWithoutTypedTarget(page)).violations).toEqual([]);
    });
  }
});
