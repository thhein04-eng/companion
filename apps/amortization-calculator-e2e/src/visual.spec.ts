import { expect, test, type Page } from '@playwright/test';
import {
  dealSheet,
  fillNumberField,
  openDealSheet,
  setTheme,
  skipSetupFor,
} from './helpers';

/**
 * Spec 010 SC-009 / SC-010 / FR-017. Screenshots go to test-output/visual/ for a manual
 * side-by-side review against design-reference.html (not pixel-diffed). Spacing, column and
 * shadow rules are asserted.
 */
async function reference(page: Page) {
  await fillNumberField(page, 'Home price', '450000');
  await fillNumberField(page, 'Down payment', '20');
  await fillNumberField(page, 'Annual property tax', '5400');
  await fillNumberField(page, "Annual homeowner's insurance", '1800');
  await fillNumberField(page, 'Monthly HOA fee', '120');
  await fillNumberField(page, 'Monthly rent', '3200');
}

const ROUTES = [
  '/amortization',
  '/deal-analyzer',
  '/financing',
  '/wealth',
  '/pro-forma',
  '/sale',
  '/refinance',
];

test.describe('Visual fidelity (spec 010 US2)', () => {
  // Review shots are taken once; the layout rules below are browser-independent.
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'one browser is enough for review shots',
  );

  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  for (const size of [
    { width: 1280, height: 800, gap: 48 },
    { width: 390, height: 844, gap: 32 },
  ]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`screens and spacing at ${size.width}px, ${theme}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto('/deal-analyzer');
        await setTheme(page, theme);
        await reference(page);
        const tag = `${size.width}-${theme}`;
        for (const route of ROUTES) {
          await page.goto(route);
          await expect(
            page.getByRole('region', { name: 'Deal' }),
          ).toBeVisible();
          await page.screenshot({
            path: `test-output/visual/${route.slice(1)}-${tag}.png`,
            fullPage: true,
            animations: 'disabled',
          });

          // SC-009: sections at least 48px apart (32px on phones).
          const gaps = await page.evaluate(() => {
            const kids = Array.from(
              document.querySelectorAll('#main-content > *'),
            ).filter((el) => (el as HTMLElement).offsetHeight > 0);
            const out: number[] = [];
            for (let i = 1; i < kids.length; i++) {
              const prev = kids[i - 1].getBoundingClientRect();
              const next = kids[i].getBoundingClientRect();
              out.push(Math.round(next.top - prev.bottom));
            }
            return out;
          });
          for (const gap of gaps)
            expect(gap, route).toBeGreaterThanOrEqual(size.gap);

          // FR-033: no input grid wider than 2 columns.
          const cols = await page.evaluate(() =>
            Array.from(document.querySelectorAll('[data-input-grid]')).map(
              (g) => getComputedStyle(g).gridTemplateColumns.split(' ').length,
            ),
          );
          for (const c of cols) expect(c, route).toBeLessThanOrEqual(2);

          // FR-017: no shadows in the page body; only floating layers have them.
          const shadowed = await page.evaluate(() =>
            Array.from(document.querySelectorAll('#main-content *'))
              .filter((el) => getComputedStyle(el).boxShadow !== 'none')
              .filter(
                (el) =>
                  !el.closest(
                    '[role="dialog"], [role="status"], [data-chart-tooltip]',
                  ),
              )
              .map(
                (el) =>
                  el.tagName +
                  '.' +
                  (el.getAttribute('class') ?? '').slice(0, 60),
              ),
          );
          expect(shadowed, route).toEqual([]);

          // No horizontal page scroll.
          const sw = await page.evaluate(
            () => document.documentElement.scrollWidth,
          );
          expect(sw, route).toBeLessThanOrEqual(size.width);
        }

        await page.goto('/financing');
        await openDealSheet(page);
        await page.screenshot({
          path: `test-output/visual/sheet-${tag}.png`,
          animations: 'disabled',
        });
        await page.keyboard.press('Escape');
        await expect(dealSheet(page)).toBeHidden();
        await page
          .getByRole('region', { name: 'Deal' })
          .getByRole('button', { name: /^Rate/ })
          .click();
        await expect(
          page.getByRole('dialog', { name: /Edit Rate/ }),
        ).toBeVisible();
        await page.screenshot({
          path: `test-output/visual/popover-${tag}.png`,
          animations: 'disabled',
        });
      });
    }
  }
});
