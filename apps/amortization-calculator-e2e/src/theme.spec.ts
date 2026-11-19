import { expect, test, type Page } from '@playwright/test';
import { setTheme, skipSetupFor } from './helpers';

const LIGHT_BG = 'rgb(246, 247, 248)'; // #f6f7f8
const DARK_BG = 'rgb(17, 20, 23)'; // #111417

const bodyBg = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe('Theme (spec 010 US2, FR-012)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  test('System follows the OS, including live changes', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/amortization');
    expect(await bodyBg(page)).toBe(DARK_BG);
    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(() => bodyBg(page)).toBe(LIGHT_BG);
  });

  test('an explicit choice overrides the OS, persists, and applies before hydration', async ({
    page,
    context,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/amortization');
    await setTheme(page, 'light');
    await expect(
      page.getByRole('button', { name: 'Theme: Light' }).first(),
    ).toBeVisible();
    await expect.poll(() => bodyBg(page)).toBe(LIGHT_BG);

    // The pre-hydration script has already set the attribute at DOMContentLoaded.
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        (
          window as unknown as { __schemeAtLoad: string | null }
        ).__schemeAtLoad =
          document.documentElement.getAttribute('data-color-scheme');
      });
    });
    await page.reload();
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { __schemeAtLoad: string | null })
            .__schemeAtLoad,
      ),
    ).toBe('light');
    expect(await bodyBg(page)).toBe(LIGHT_BG);

    const other = await context.newPage();
    await other.emulateMedia({ colorScheme: 'dark' });
    await other.goto('/wealth');
    expect(await bodyBg(other)).toBe(LIGHT_BG);
  });

  test('Dark is reachable and named for screen readers', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/financing');
    await setTheme(page, 'dark');
    await expect(
      page.getByRole('button', { name: 'Theme: Dark' }).first(),
    ).toBeVisible();
    await expect.poll(() => bodyBg(page)).toBe(DARK_BG);
  });
});
