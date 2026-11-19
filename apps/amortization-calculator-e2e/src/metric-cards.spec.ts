import { expect, test, type Page } from '@playwright/test';
import { fillNumberField, skipSetupFor } from './helpers';

/** The spec 010 reference deal: $450k, 20% down, 6.5%, tax 5,400, ins 1,800, HOA 120, rent 3,200. */
async function enterReference(page: Page, { rent = true } = {}) {
  await fillNumberField(page, 'Home price', '450000');
  await fillNumberField(page, 'Down payment', '20');
  await fillNumberField(page, 'Annual property tax', '5400');
  await fillNumberField(page, "Annual homeowner's insurance", '1800');
  await fillNumberField(page, 'Monthly HOA fee', '120');
  if (rent) await fillNumberField(page, 'Monthly rent', '3200');
}

const IDS = ['cap-rate', 'rule-1-rule', 'rule-50-rule'];

async function boxes(page: Page) {
  return Promise.all(
    IDS.map((id) =>
      page.getByTestId(id).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x),
          y: Math.round(r.y),
          h: Math.round(r.height),
        };
      }),
    ),
  );
}

test.describe('Metric cards (spec 011 US3)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  test('three equal cards in one row with the reference values', async ({
    page,
  }) => {
    await page.goto('/deal-analyzer');
    await enterReference(page);
    await expect(page.getByTestId('cap-rate')).toContainText('4.65%');
    await expect(page.getByTestId('rule-1-rule')).toContainText('0.71%');
    await expect(page.getByTestId('rule-1-rule')).toContainText('Fail');
    await expect(page.getByTestId('rule-50-rule')).toContainText('45.5%');
    await expect(page.getByTestId('rule-50-rule')).toContainText('Pass');
    const b = await boxes(page);
    expect(new Set(b.map((x) => x.y)).size).toBe(1);
    expect(
      Math.max(...b.map((x) => x.h)) - Math.min(...b.map((x) => x.h)),
    ).toBeLessThanOrEqual(1);
  });

  test('every card keeps its layout as N/A without rent', async ({ page }) => {
    await page.goto('/deal-analyzer');
    await enterReference(page);
    await fillNumberField(page, 'Monthly rent', '0');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('rule-50-rule')).toContainText('N/A');
    const b = await boxes(page);
    expect(new Set(b.map((x) => x.y)).size).toBe(1);
  });

  test('stacks in one column on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/deal-analyzer');
    await enterReference(page);
    const b = await boxes(page);
    expect(new Set(b.map((x) => x.x)).size).toBe(1);
    expect(b[0].y).toBeLessThan(b[1].y);
    expect(b[1].y).toBeLessThan(b[2].y);
  });
});
