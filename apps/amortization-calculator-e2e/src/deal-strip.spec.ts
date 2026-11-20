import { expect, test, type Page } from '@playwright/test';
import {
  closeDealSheet,
  dealSheet,
  fillDealField,
  openDealSheet,
  skipSetupFor,
} from './helpers';

const PAGES = [
  '/amortization',
  '/deal-analyzer',
  '/financing',
  '/wealth',
  '/pro-forma',
  '/sale',
  '/sensitivity',
];

/** The quickstart reference deal: price 450,000, 20% down, 6.5%, 30 yr, rent 3,200. */
async function enterReference(page: Page) {
  await fillDealField(page, 'Home price', '450000');
  await fillDealField(page, 'Down payment', '20');
  await fillDealField(page, 'Annual property tax', '5400');
  await fillDealField(page, "Annual homeowner's insurance", '1800');
  await fillDealField(page, 'Monthly HOA fee', '120');
  await fillDealField(page, 'Monthly rent', '3200');
  await closeDealSheet(page);
}

const strip = (page: Page) => page.getByRole('region', { name: 'Deal' });

test.describe('Deal Strip (spec 010 US1)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  test('every page shows the strip and none repeats the shared input sections', async ({
    page,
  }) => {
    for (const path of PAGES) {
      await page.goto(path);
      await expect(strip(page)).toBeVisible();
      for (const name of ['Loan', 'Real-estate costs', 'Rental income']) {
        await expect(
          page.locator('main').getByRole('heading', { name, exact: true }),
        ).toHaveCount(0);
      }
    }
  });

  test('a Rate chip edit on Financing updates DSCR live and previews it', async ({
    page,
  }) => {
    await page.goto('/financing');
    await enterReference(page);
    const dscrBefore = await page.getByTestId('dscr').textContent();
    await strip(page).getByRole('button', { name: /^Rate/ }).click();
    const popover = page.getByRole('dialog', { name: /Edit Rate/ });
    const input = popover.getByRole('textbox', {
      name: 'Annual interest rate',
    });
    await input.click();
    await page.keyboard.press('ControlOrMeta+A');
    await input.pressSequentially('6');
    await expect(page.getByTestId('dscr')).not.toHaveText(dscrBefore ?? '');
    await expect(popover.getByTestId('headline-preview')).toHaveText(
      /DSCR .* → /,
    );
    await page.keyboard.press('Escape');
    await expect(
      strip(page).getByRole('button', { name: /^Rate/ }),
    ).toContainText('6%');
  });

  test('the sheet takes focus, and Escape returns it to Edit deal', async ({
    page,
  }) => {
    await page.goto('/wealth');
    const sheet = await openDealSheet(page);
    await expect
      .poll(() => sheet.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(dealSheet(page)).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Edit deal', exact: true }),
    ).toBeFocused();
  });

  test('loan amount reads as derived once price and down payment are set', async ({
    page,
  }) => {
    await page.goto('/amortization');
    await fillDealField(page, 'Home price', '450000');
    await fillDealField(page, 'Down payment', '20');
    await expect(
      dealSheet(page).getByTestId('derived-principal'),
    ).toContainText('from price and down payment');
    await expect(
      dealSheet(page).getByRole('textbox', {
        name: 'Loan amount',
        exact: true,
      }),
    ).toHaveValue('$360,000.00');
    await closeDealSheet(page);
    await expect(
      strip(page).getByRole('button', { name: /^Loan amount/ }),
    ).toContainText('$360,000');
  });

  test('the strip stays in view while the page scrolls', async ({ page }) => {
    await page.goto('/amortization');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const box = await strip(page).boundingBox();
    expect(box).not.toBeNull();
    expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
    expect(box?.y ?? 999).toBeLessThan(120);
  });

  test('on a phone the sheet opens from the bottom and nothing scrolls sideways', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/deal-analyzer');
    const sheet = await openDealSheet(page);
    const box = await sheet.boundingBox();
    expect(box?.y ?? 0).toBeGreaterThan(100);
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(390);
  });

  test('switching scenario tabs switches the chips', async ({ page }) => {
    await page.goto('/financing');
    await fillDealField(page, 'Annual interest rate', '7');
    await closeDealSheet(page);
    await page
      .getByRole('button', { name: 'Add scenario', exact: true })
      .click();
    await fillDealField(page, 'Annual interest rate', '5');
    await closeDealSheet(page);
    await expect(
      strip(page).getByRole('button', { name: /^Rate/ }),
    ).toContainText('5%');
    await strip(page).getByRole('tab', { name: 'Scenario 1' }).click();
    await expect(
      strip(page).getByRole('button', { name: /^Rate/ }),
    ).toContainText('7%');
  });
});

test.describe('Sentence and payment bar (spec 010 US4)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  test('editing the rate in the sentence updates the chip', async ({
    page,
  }) => {
    await page.goto('/financing');
    const sheet = await openDealSheet(page);
    await sheet.getByRole('button', { name: /^Rate 6\.5%/ }).click();
    const input = sheet.getByRole('textbox', { name: 'Rate', exact: true });
    await input.fill('6');
    await input.press('Enter');
    await expect(sheet.getByTestId('deal-sentence')).toContainText('at 6% for');
    await closeDealSheet(page);
    await expect(
      strip(page).getByRole('button', { name: /^Rate/ }),
    ).toContainText('6%');
  });

  test('activating a payment-bar cost focuses its field', async ({ page }) => {
    await page.goto('/amortization');
    await enterReference(page);
    const sheet = await openDealSheet(page);
    await sheet
      .getByTestId('payment-legend')
      .getByRole('button', { name: 'Property tax' })
      .click();
    await expect(
      sheet.getByRole('textbox', { name: 'Annual property tax', exact: true }),
    ).toBeFocused();
  });
});

test.describe('Scrub and relevance (spec 010 US5)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  test('dragging the Rate label steps the rate and shows a signed DSCR delta', async ({
    page,
  }) => {
    await page.goto('/financing');
    await enterReference(page);
    await strip(page).getByRole('button', { name: /^Rate/ }).click();
    const popover = page.getByRole('dialog', { name: /Edit Rate/ });
    const label = popover.locator('[data-scrub-area]');
    const box = await label.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    expect(box.width).toBeGreaterThan(0);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 40, box.y + box.height / 2, {
      steps: 10,
    });
    await page.mouse.up();
    await expect(
      popover.getByRole('textbox', {
        name: 'Annual interest rate',
        exact: true,
      }),
    ).not.toHaveValue('6.5');
    await expect(popover.getByTestId('headline-delta')).toHaveText(/^[+−]/);
  });

  test('arrow keys step by 0.01 and Shift by 0.1', async ({ page }) => {
    await page.goto('/financing');
    await strip(page).getByRole('button', { name: /^Rate/ }).click();
    const input = page
      .getByRole('dialog', { name: /Edit Rate/ })
      .getByRole('textbox', { name: 'Annual interest rate', exact: true });
    await input.focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('6.54');
    await page.keyboard.press('Shift+ArrowUp');
    await expect(input).toHaveValue('6.64');
  });

  test('a typed rate keeps its exact value', async ({ page }) => {
    await page.goto('/financing');
    await strip(page).getByRole('button', { name: /^Rate/ }).click();
    const input = page
      .getByRole('dialog', { name: /Edit Rate/ })
      .getByRole('textbox', { name: 'Annual interest rate', exact: true });
    await input.fill('6.37');
    await input.press('Enter');
    await expect(input).toHaveValue('6.37');
  });

  for (const [path, first] of [
    [
      '/amortization',
      ['principal', 'annualInterestRatePct', 'termMonths', 'total'],
    ],
    [
      '/deal-analyzer',
      ['homePrice', 'downPayment', 'rental.grossMonthlyRent', 'total'],
    ],
    [
      '/financing',
      ['annualInterestRatePct', 'termMonths', 'rental.grossMonthlyRent'],
    ],
    ['/wealth', ['homePrice', 'downPayment', 'rental.grossMonthlyRent']],
    [
      '/pro-forma',
      ['homePrice', 'rental.grossMonthlyRent', 'annualInterestRatePct'],
    ],
    ['/sale', ['homePrice', 'downPayment', 'annualInterestRatePct']],
    [
      '/sensitivity',
      [
        'annualInterestRatePct',
        'homePrice',
        'downPayment',
        'rental.grossMonthlyRent',
      ],
    ],
  ] as const) {
    test(`${path} emphasizes the inputs it uses`, async ({ page }) => {
      await page.goto(path);
      for (const key of first.filter((k) => k !== 'total')) {
        await expect(
          strip(page).locator(`[data-chip="${key}"]`),
        ).toHaveAttribute('data-tone', 'pin');
      }
    });
  }

  test('/amortization mutes rent, which it does not use', async ({ page }) => {
    await page.goto('/amortization');
    await expect(
      strip(page).locator('[data-chip="rental.grossMonthlyRent"]'),
    ).toHaveAttribute('data-tone', 'muted');
  });
});

test.describe('First screen (spec 010 SC-001)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  for (const size of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    test(`page content starts in the first screen at ${size.width}×${size.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await page.goto('/deal-analyzer');
      await enterReference(page);
      for (const path of PAGES) {
        await page.goto(path);
        await expect(strip(page)).toBeVisible();
        const top = await page.evaluate(() => {
          const stripEl = document.querySelector('[data-testid="deal-strip"]');
          let next = stripEl?.nextElementSibling ?? null;
          while (next && (next as HTMLElement).offsetHeight === 0) {
            next = next.nextElementSibling;
          }
          return next
            ? next.getBoundingClientRect().top
            : Number.POSITIVE_INFINITY;
        });
        expect(top, path).toBeLessThan(size.height);
      }
    });
  }
});
