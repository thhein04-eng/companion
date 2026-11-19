import { expect, test, type Page } from '@playwright/test';
import {
  closeDealSheet,
  dealSheet,
  fillNumberField,
  openDealSheet,
  skipSetupFor,
} from './helpers';

/**
 * Spec 012 US1: the rent roll. Uses spec 002's reference vector A ($250k, 25% down, 7% / 30yr,
 * $3,000 tax, $1,200 insurance, default 5/8/5/5%): a $2,400 rent gives $250.56/mo cash flow.
 */
async function enterReferenceDeal(page: Page, rent = '2400') {
  await page.goto('/deal-analyzer');
  await fillNumberField(page, 'Home price', '250000');
  await fillNumberField(page, 'Down payment', '25');
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Annual property tax', '3000');
  await fillNumberField(page, "Annual homeowner's insurance", '1200');
  await fillNumberField(page, 'Monthly rent', rent);
  await page.keyboard.press('Tab');
}

const strip = (page: Page) => page.getByRole('region', { name: 'Deal' });
const rentCell = (page: Page) =>
  strip(page).locator('[data-chip="rental.grossMonthlyRent"]');
const cashFlow = (page: Page) =>
  page
    .getByRole('region', { name: 'Rental Income vs. Operating Expenses' })
    .getByTestId('row-cash-flow');
const units = (page: Page) => dealSheet(page).getByTestId('rent-unit');

async function setUnitRent(page: Page, unit: string, value: string) {
  const input = dealSheet(page)
    .getByRole('group', { name: unit })
    .getByRole('textbox', { name: 'Rent', exact: true });
  await input.click();
  await page.keyboard.press('ControlOrMeta+A');
  await input.pressSequentially(value);
  await page.keyboard.press('Tab');
}

async function addUnit(page: Page) {
  await (await openDealSheet(page)).getByTestId('add-unit').click();
}

test.describe('Rent roll (spec 012 US1)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  test('a single rent stays one "Monthly rent" field with unchanged figures', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    await openDealSheet(page);
    await expect(dealSheet(page).getByTestId('add-unit')).toBeVisible();
    await expect(units(page)).toHaveCount(0);
    await closeDealSheet(page);
    await expect(cashFlow(page)).toContainText('$250.56');
    await expect(rentCell(page)).toContainText('$2,400');
    await expect(rentCell(page)).not.toContainText('units');
  });

  test('two units of $1,200 equal one $2,400 rent', async ({ page }) => {
    await enterReferenceDeal(page);
    await addUnit(page);
    await expect(units(page)).toHaveCount(2);
    await setUnitRent(page, 'Unit A', '1200');
    await setUnitRent(page, 'Unit B', '1200');
    await expect(dealSheet(page).getByTestId('rent-roll-total')).toHaveText(
      'Total rent $2,400.00/mo',
    );
    await closeDealSheet(page);
    await expect(rentCell(page)).toContainText('$2,400 · 2 units');
    await expect(cashFlow(page)).toContainText('$250.56');
    await expect(page.getByTestId('row-unit')).toHaveCount(2);
  });

  test('the Rent value of a rent roll opens the sheet at the rent roll', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    await addUnit(page);
    await closeDealSheet(page);
    await rentCell(page).click();
    await expect(dealSheet(page)).toBeVisible();
    await expect(
      dealSheet(page).getByTestId('rent-roll').locator('input').first(),
    ).toBeFocused();
  });

  test('removing a unit is undoable', async ({ page }) => {
    await page.clock.install();
    await enterReferenceDeal(page);
    await addUnit(page);
    await setUnitRent(page, 'Unit B', '1400');
    // Edits more than 800ms apart are separate changes, so Undo restores only the removal.
    await page.clock.fastForward(1_000);
    await dealSheet(page)
      .getByRole('button', { name: 'Remove Unit B' })
      .click();
    await expect(units(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(units(page)).toHaveCount(2);
    await expect(
      dealSheet(page).getByRole('group', { name: 'Unit B' }),
    ).toBeVisible();
  });

  test('a unit’s own vacancy rate: 5% + 10% gives $207.50, cleared gives $137.50 (US2)', async ({
    page,
  }) => {
    await enterReferenceDeal(page, '1350');
    await addUnit(page);
    await setUnitRent(page, 'Unit B', '1400');
    const vacancyB = dealSheet(page)
      .getByRole('group', { name: 'Unit B' })
      .getByRole('textbox', { name: 'Vacancy', exact: true });
    await vacancyB.click();
    await vacancyB.pressSequentially('10');
    await page.keyboard.press('Tab');
    await closeDealSheet(page);
    const vacancy = page.getByTestId('row-vacancy');
    await expect(vacancy).toContainText('Vacancy');
    await expect(vacancy).not.toContainText('%');
    await expect(vacancy).toContainText('$207.50');
    await expect(page.getByTestId('row-unit').nth(1)).toContainText(
      'vacancy 10% ($140.00)',
    );

    await openDealSheet(page);
    await vacancyB.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Tab');
    await closeDealSheet(page);
    await expect(vacancy).toContainText('Vacancy (5%)');
    await expect(vacancy).toContainText('$137.50');
  });

  test('stops at 4 units', async ({ page }) => {
    await enterReferenceDeal(page);
    for (let i = 0; i < 3; i++) await addUnit(page);
    await expect(units(page)).toHaveCount(4);
    await expect(dealSheet(page).getByTestId('add-unit')).toBeDisabled();
    await expect(
      dealSheet(page).getByText('Rent rolls cover 1–4 unit homes.'),
    ).toBeVisible();
  });

  test('the rent roll is kept across a reload and a scenario switch', async ({
    page,
  }) => {
    await enterReferenceDeal(page);
    await addUnit(page);
    await setUnitRent(page, 'Unit B', '900');
    await closeDealSheet(page);
    await expect(rentCell(page)).toContainText('$3,300 · 2 units');

    await page.reload();
    await expect(rentCell(page)).toContainText('$3,300 · 2 units');

    await page
      .getByRole('button', { name: 'Add scenario', exact: true })
      .click();
    await strip(page).getByRole('tab', { name: 'Scenario 1' }).click();
    await expect(rentCell(page)).toContainText('$3,300 · 2 units');
  });

  test('a 4-unit rent roll never scrolls sideways at 390px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterReferenceDeal(page);
    for (let i = 0; i < 3; i++) await addUnit(page);
    await expect(units(page)).toHaveCount(4);
    const widths = await dealSheet(page).evaluate((el) => ({
      page: document.documentElement.scrollWidth,
      sheet: el.scrollWidth - el.clientWidth,
    }));
    expect(widths.page).toBeLessThanOrEqual(390);
    expect(widths.sheet).toBeLessThanOrEqual(0);
  });
});
