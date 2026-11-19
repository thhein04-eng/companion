import { expect, test } from '@playwright/test';
import { fillNumberField, skipSetupFor } from './helpers';

test.beforeEach(async ({ page }) => {
  await skipSetupFor(page);
});

test.describe('Glossary & Formulas (spec 015)', () => {
  test('has its own route, title, heading and nav link', async ({ page }) => {
    await page.goto('/amortization');
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Glossary' })
      .click();
    await expect(page).toHaveURL(/\/glossary$/);
    await expect(page).toHaveTitle('Glossary & Formulas · Companion');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Glossary & Formulas' }),
    ).toBeVisible();
    await expect(page.getByTestId('glossary-entry-dscr')).toContainText(
      'annual NOI ÷ annual principal & interest',
    );
  });

  test('search by abbreviation, empty state and clear', async ({ page }) => {
    await page.goto('/glossary');
    await page.getByLabel('Search terms').fill('coc');
    await expect(page.getByTestId('glossary-entry-cash-on-cash')).toBeVisible();
    await expect(page.getByTestId('glossary-entry-dscr')).toHaveCount(0);

    await page.getByLabel('Search terms').fill('zzz');
    await expect(page.getByTestId('glossary-count')).toHaveText('No terms match "zzz"');
    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(page.getByTestId('glossary-entry-dscr')).toBeVisible();
  });

  test('category chip combines with search', async ({ page }) => {
    await page.goto('/glossary');
    await page.getByRole('button', { name: 'Financing & DSCR' }).click();
    await expect(page.getByTestId('glossary-entry-noi')).toHaveCount(0);
    await page.getByLabel('Search terms').fill('min');
    await expect(page.getByTestId('glossary-entry-minimum-dscr')).toBeVisible();
  });

  test('a #hash highlights the entry; an unknown hash shows the full list', async ({
    page,
  }) => {
    await page.goto('/glossary#dscr');
    const dscr = page.getByTestId('glossary-entry-dscr');
    await expect(dscr).toHaveAttribute('aria-current', 'true');
    await expect(dscr).toBeInViewport();

    await page.goto('/glossary#nope');
    await expect(page.getByTestId('glossary-entry-dscr')).toBeVisible();
    await expect(page.locator('[data-highlighted]')).toHaveCount(0);
  });

  test('the DSCR info popover links to its definition, by keyboard', async ({
    page,
  }) => {
    await page.goto('/financing');
    await fillNumberField(page, 'Home price', '450000');
    await fillNumberField(page, 'Down payment', '20');
    await fillNumberField(page, 'Annual property tax', '5400');
    await fillNumberField(page, 'Monthly rent', '3200');
    await page.keyboard.press('Tab');
    await page.getByRole('button', { name: 'About DSCR' }).focus();
    await page.keyboard.press('Enter');
    const link = page.getByRole('link', { name: 'Full definition' });
    await expect(link).toBeVisible();
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/glossary#dscr$/);
    await expect(page.getByTestId('glossary-entry-dscr')).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  test('every "Used on" link points at a real nav route', async ({ page }) => {
    await page.goto('/glossary');
    const navHrefs = await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    const usedOn = await page
      .locator('article a[href^="/"]:not([href*="#"])')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(usedOn.length).toBeGreaterThan(0);
    for (const href of new Set(usedOn)) expect(navHrefs).toContain(href);
  });

  test('has no horizontal scroll at 375 px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/glossary');
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
