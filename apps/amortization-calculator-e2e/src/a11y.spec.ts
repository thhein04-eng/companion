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
});
