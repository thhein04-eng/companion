import { expect, test, type Page } from '@playwright/test';
import { fillNumberField } from './helpers';

/**
 * Spec 003 User Story 2 — responsive, collapsible left-side menu
 * (contracts/routes-and-navigation.md "Shell DOM / ARIA contract" and
 * "Behavior guarantees").
 */

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };

function primaryNav(page: Page) {
  return page.getByRole('navigation', { name: 'Primary' });
}

/**
 * Opens the mobile drawer. Retries the click because a press that lands
 * before React hydrates the server-rendered button does nothing.
 */
async function openDrawer(page: Page) {
  const dialog = page.getByRole('dialog');
  await expect(async () => {
    if (!(await dialog.isVisible())) {
      await page.getByRole('button', { name: 'Open navigation' }).click();
    }
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass();
  return dialog;
}

/**
 * Sets the docked menu's collapsed state with its toggle button. Retries,
 * clicking only while the state still differs, because a press that lands
 * before React hydrates the server-rendered button does nothing.
 */
async function setNavCollapsed(page: Page, collapsed: boolean) {
  const shell = page.getByTestId('app-shell');
  const want = String(collapsed);
  await expect(async () => {
    if ((await shell.getAttribute('data-nav-collapsed')) !== want) {
      await page.locator('button[aria-controls="primary-nav"]').click();
    }
    await expect(shell).toHaveAttribute('data-nav-collapsed', want, {
      timeout: 1_000,
    });
  }).toPass();
}

test.describe('Navigation — desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP);
  });

  test('(a)(b) one docked Primary nav with both links; the current page is marked', async ({
    page,
  }) => {
    await page.goto('/amortization');
    await expect(primaryNav(page)).toHaveCount(1);
    const nav = primaryNav(page);
    await expect(nav).toBeVisible();

    const amort = nav.getByRole('link', { name: 'Amortization Calculator' });
    const deal = nav.getByRole('link', { name: 'Rental Deal Analyzer' });
    await expect(amort).toHaveAttribute('aria-current', 'page');
    await expect(deal).not.toHaveAttribute('aria-current', 'page');
    await expect(
      page.getByRole('button', { name: 'Open navigation' }),
    ).toBeHidden();
  });

  test('(c)(d) collapses to a rail, keeps link names, and remembers the choice', async ({
    page,
  }) => {
    await page.goto('/amortization');
    const shell = page.getByTestId('app-shell');
    const collapse = page.getByRole('button', { name: 'Collapse navigation' });
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
    await expect(shell).toHaveAttribute('data-nav-collapsed', 'false');

    await setNavCollapsed(page, true);
    const expand = page.getByRole('button', { name: 'Expand navigation' });
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await expect(shell).toHaveAttribute('data-nav-collapsed', 'true');
    await expect(
      primaryNav(page).getByRole('link', { name: 'Rental Deal Analyzer' }),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('app-shell')).toHaveAttribute(
      'data-nav-collapsed',
      'true',
    );
    await expect(
      page.getByRole('button', { name: 'Expand navigation' }),
    ).toBeVisible();
    await setNavCollapsed(page, false);
  });

  test('(e) the toggle works from the keyboard with Enter and Space', async ({
    page,
  }) => {
    await page.goto('/amortization');
    const shell = page.getByTestId('app-shell');
    // Round-trip once with the hydration-safe helper so the key presses
    // below reach a hydrated button.
    await setNavCollapsed(page, true);
    await setNavCollapsed(page, false);
    await page.getByRole('button', { name: 'Collapse navigation' }).focus();
    await page.keyboard.press('Enter');
    await expect(shell).toHaveAttribute('data-nav-collapsed', 'true');
    await page.keyboard.press('Space');
    await expect(shell).toHaveAttribute('data-nav-collapsed', 'false');
  });

  test('(f) following a menu link keeps unsaved in-memory state and moves aria-current', async ({
    page,
  }) => {
    await page.goto('/amortization');
    await fillNumberField(page, 'Home price', '250000');
    await page.keyboard.press('Tab');

    await primaryNav(page)
      .getByRole('link', { name: 'Rental Deal Analyzer' })
      .click();
    await expect(page).toHaveURL(/\/deal-analyzer$/);
    await expect(
      page.getByRole('textbox', { name: 'Home price', exact: true }),
    ).toHaveValue('$250,000.00');
    await expect(
      primaryNav(page).getByRole('link', { name: 'Rental Deal Analyzer' }),
    ).toHaveAttribute('aria-current', 'page');
  });
});

test.describe('Navigation — mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE);
  });

  test('(g) the docked nav is hidden behind an "Open navigation" button', async ({
    page,
  }) => {
    await page.goto('/amortization');
    await expect(primaryNav(page)).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Open navigation' }),
    ).toBeVisible();
  });

  test('(h) the drawer traps focus, closes on Escape, and returns focus to the button', async ({
    page,
  }) => {
    await page.goto('/amortization');
    const open = page.getByRole('button', { name: 'Open navigation' });
    const dialog = await openDrawer(page);
    await expect(
      dialog.getByRole('navigation', { name: 'Primary' }),
    ).toBeVisible();

    // Focus must never reach anything outside the drawer. (WebKit, like
    // Safari's default "Tab skips links" setting, can park focus on <body>
    // once it passes the close button; the page behind is inert, so nothing
    // outside the drawer is reachable either way.)
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const escaped = await dialog.evaluate(
        (el) =>
          document.activeElement !== document.body &&
          !el.contains(document.activeElement),
      );
      expect(escaped).toBe(false);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
  });

  test('(i) following a link closes the drawer and focuses the new page heading', async ({
    page,
  }) => {
    await page.goto('/amortization');
    await openDrawer(page);
    await page
      .getByRole('dialog')
      .getByRole('link', { name: 'Rental Deal Analyzer' })
      .click();

    await expect(page).toHaveURL(/\/deal-analyzer$/);
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(
      page.getByRole('heading', { name: 'Rental Deal Analyzer', level: 1 }),
    ).toBeFocused();
  });

  test('(j) the close button closes the drawer', async ({ page }) => {
    await page.goto('/amortization');
    await openDrawer(page);
    await page.getByRole('button', { name: 'Close navigation' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('(j) pressing the backdrop closes the drawer', async ({ page }) => {
    await page.goto('/amortization');
    await openDrawer(page);
    await expect(page.getByRole('dialog')).toBeVisible();
    // The sheet is 18rem wide on the left; press well to its right.
    await page.mouse.click(MOBILE.width - 20, MOBILE.height / 2);
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('(k) widening past the breakpoint closes the drawer and shows the docked nav', async ({
    page,
  }) => {
    await page.goto('/amortization');
    await openDrawer(page);
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.setViewportSize(DESKTOP);
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(primaryNav(page)).toBeVisible();
  });
});

test.describe('Navigation — narrow layout', () => {
  for (const path of ['/amortization', '/deal-analyzer']) {
    test(`(l) no horizontal page scroll at 320px on ${path}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test('not-found renders inside the shell', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/nope');
  await expect(
    page.getByRole('heading', { name: 'Page not found', level: 1 }),
  ).toBeVisible();
  await expect(
    primaryNav(page).getByRole('link', { name: 'Amortization Calculator' }),
  ).toBeVisible();
});
