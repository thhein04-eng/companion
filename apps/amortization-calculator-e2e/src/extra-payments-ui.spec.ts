import { expect, test, type Page } from '@playwright/test';
import { skipSetupFor } from './helpers';

const form = (page: Page) =>
  page.getByRole('form', { name: 'Add an extra payment' });

async function typeAmount(page: Page, value: string) {
  const input = form(page).getByRole('textbox', {
    name: 'Amount',
    exact: true,
  });
  await input.click();
  await page.keyboard.press('ControlOrMeta+A');
  await input.pressSequentially(value);
  await page.keyboard.press('Tab');
}

test.describe('Extra payments card (spec 011 US2)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  test('controls align on one row with visible labels', async ({ page }) => {
    await page.goto('/amortization');
    await expect(form(page).getByText('Type')).toBeVisible();
    await expect(form(page).getByText('When')).toBeVisible();
    await expect(
      form(page).getByText('Every month, starting with payment 1'),
    ).toBeVisible();
    const bottoms = await form(page).evaluate((el) => {
      const pick = [
        el.querySelector('[role="radiogroup"]'),
        el.querySelector('input[type="text"]')?.parentElement,
        Array.from(el.querySelectorAll('span')).find((s) =>
          s.textContent?.startsWith('Every month'),
        ),
        Array.from(el.querySelectorAll('button')).find(
          (b) => b.textContent === 'Add',
        ),
      ];
      return pick.map((n) =>
        Math.round((n as Element).getBoundingClientRect().bottom),
      );
    });
    expect(Math.max(...bottoms) - Math.min(...bottoms)).toBeLessThanOrEqual(8);
  });

  for (const width of [1280, 390]) {
    test(`a $1,000,000 amount shows in full at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/amortization');
      await typeAmount(page, '1000000');
      const input = form(page).getByRole('textbox', {
        name: 'Amount',
        exact: true,
      });
      await expect(input).toHaveValue('$1,000,000.00');
      expect(
        await input.evaluate(
          (el) => el.scrollWidth <= (el as HTMLInputElement).clientWidth,
        ),
      ).toBe(true);
    });
  }

  test('lists recurring and one-time payments and removes one', async ({
    page,
  }) => {
    await page.goto('/amortization');
    await expect(page.getByTestId('extra-payments-empty')).toBeVisible();
    await typeAmount(page, '200');
    await form(page).getByRole('button', { name: 'Add', exact: true }).click();
    await form(page).getByRole('radio', { name: 'One-time' }).click();
    await expect(form(page).getByText('Date', { exact: true })).toBeVisible();
    await typeAmount(page, '5000');
    await form(page).getByRole('button', { name: 'Add', exact: true }).click();

    const rows = page.getByTestId('extra-payment-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Monthly');
    await expect(rows.nth(0)).toContainText('Monthly from payment 1');
    await expect(rows.nth(1)).toContainText('One-time');
    await expect(rows.nth(1)).toContainText('$5,000.00');

    await page
      .getByRole('button', { name: 'Remove extra payment of $200.00' })
      .click();
    await expect(rows).toHaveCount(1);
    await expect(rows.nth(0)).toContainText('One-time');
  });

  test('stacks on a phone, with many payments and no sideways scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/amortization');
    for (let i = 1; i <= 10; i++) {
      await typeAmount(page, String(100 * i));
      await form(page)
        .getByRole('button', { name: 'Add', exact: true })
        .click();
    }
    const rows = page.getByTestId('extra-payment-row');
    await expect(rows).toHaveCount(10);
    const overlaps = await rows.evaluateAll(
      (els) =>
        els.slice(1).filter((el, i) => {
          const prev = els[i].getBoundingClientRect();
          return el.getBoundingClientRect().top < prev.bottom - 0.5;
        }).length,
    );
    expect(overlaps).toBe(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  });
});
