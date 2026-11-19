import { expect, test, type Page } from '@playwright/test';
import {
  closeDealSheet,
  dealSheet,
  fillNumberField,
  openDealSheet,
  skipSetupFor,
} from './helpers';

/** Spec 012 US3: living in Unit A ($1,350 after move-out) while renting Unit B ($1,400). */
async function enterHouseHack(page: Page) {
  await page.goto('/deal-analyzer');
  await fillNumberField(page, 'Home price', '250000');
  await fillNumberField(page, 'Down payment', '25');
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Annual property tax', '3000');
  await fillNumberField(page, "Annual homeowner's insurance", '1200');
  await fillNumberField(page, 'Monthly rent', '1350');
  await page.keyboard.press('Tab');
  const sheet = await openDealSheet(page);
  await sheet.getByTestId('add-unit').click();
  const rentB = sheet
    .getByRole('group', { name: 'Unit B' })
    .getByRole('textbox', { name: 'Rent', exact: true });
  await rentB.click();
  await page.keyboard.press('ControlOrMeta+A');
  await rentB.pressSequentially('1400');
  await page.keyboard.press('Tab');
}

async function liveInUnitA(page: Page, live = true) {
  const box = (await openDealSheet(page))
    .getByRole('group', { name: 'Unit A' })
    .getByRole('checkbox', { name: 'I live here' });
  if (live) await box.check();
  else await box.uncheck();
}

const strip = (page: Page) => page.getByRole('region', { name: 'Deal' });
const rentCell = (page: Page) =>
  strip(page).locator('[data-chip="rental.grossMonthlyRent"]');
const cardSwitch = (page: Page) => strip(page).getByTestId('occupancy-view');
const cashFlow = (page: Page) =>
  page
    .getByRole('region', { name: 'Rental Income vs. Operating Expenses' })
    .getByTestId('row-cash-flow');

test.describe('House-hacking (spec 012 US3)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  test('living in Unit A shows the switch, rent while living there and the net housing cost', async ({
    page,
  }) => {
    await enterHouseHack(page);
    await liveInUnitA(page);
    await expect(
      dealSheet(page).getByRole('textbox', { name: 'Rent after move-out' }),
    ).toHaveValue('$1,350.00');
    await closeDealSheet(page);

    await expect(
      cardSwitch(page).getByRole('radio', { name: 'Living there' }),
    ).toBeChecked();
    await expect(page.getByTestId('occupancy-view')).toHaveCount(2); // card + page
    await expect(rentCell(page)).toContainText('$1,400 · 2 units');
    await expect(page.getByTestId('net-housing-cost')).toBeVisible();
    await expect(page.getByTestId('rule-1-rule')).toContainText(
      'Based on full rent after move-out',
    );
  });

  test('"After move-out" equals both units rented, and the choice is shared across pages', async ({
    page,
  }) => {
    await enterHouseHack(page);
    await closeDealSheet(page);
    const bothRented = await cashFlow(page).textContent();

    await liveInUnitA(page);
    await closeDealSheet(page);
    await expect(cashFlow(page)).not.toHaveText(bothRented ?? '');

    await cardSwitch(page)
      .getByRole('radio', { name: 'After move-out' })
      .click();
    await expect(rentCell(page)).toContainText('$2,750 · 2 units');
    await expect(cashFlow(page)).toHaveText(bothRented ?? '');
    await expect(page.getByTestId('net-housing-cost')).toHaveCount(0);

    await page.goto('/financing');
    await expect(
      page
        .getByTestId('occupancy-view')
        .last()
        .getByRole('radio', { name: 'After move-out' }),
    ).toBeChecked();
  });

  test('marks the move-out year on Wealth and Hold & Exit', async ({
    page,
  }) => {
    await enterHouseHack(page);
    await liveInUnitA(page);
    await closeDealSheet(page);

    await page.goto('/wealth');
    await expect(
      page.getByTestId('chart-net-worth').getByTestId('move-out-marker'),
    ).toBeVisible();
    await expect(
      page.getByTestId('wealth-row-1').getByTestId('move-out-marker'),
    ).toBeVisible();

    await page.goto('/pro-forma');
    await expect(
      page.getByTestId('pro-forma-row-1').getByTestId('move-out-marker'),
    ).toBeVisible();
  });

  test('unchecking "I live here" keeps the after-move-out rent and hides the switch', async ({
    page,
  }) => {
    await enterHouseHack(page);
    await liveInUnitA(page);
    await liveInUnitA(page, false);
    await expect(
      dealSheet(page)
        .getByRole('group', { name: 'Unit A' })
        .getByRole('textbox', { name: 'Rent', exact: true }),
    ).toHaveValue('$1,350.00');
    await closeDealSheet(page);
    await expect(page.getByTestId('occupancy-view')).toHaveCount(0);
    await expect(rentCell(page)).toContainText('$2,750 · 2 units');
  });

  test('removing the owner’s unit ends the house-hack', async ({ page }) => {
    await enterHouseHack(page);
    await liveInUnitA(page);
    await dealSheet(page)
      .getByRole('button', { name: 'Remove Unit A' })
      .click();
    await closeDealSheet(page);
    await expect(page.getByTestId('occupancy-view')).toHaveCount(0);
    await expect(page.getByTestId('net-housing-cost')).toHaveCount(0);
  });
});
