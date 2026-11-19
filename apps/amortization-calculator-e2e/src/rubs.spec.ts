import { expect, test, type Page } from '@playwright/test';
import {
  closeDealSheet,
  dealSheet,
  fillNumberField,
  openDealSheet,
  skipSetupFor,
} from './helpers';

/**
 * Spec 012 US4: a $180 Water/Sewer bill on a duplex (Unit A $1,350, Unit B $1,400) with 0%
 * vacancy. Billed back to the tenants (RUBS), it comes back as income: $180 with both units
 * rented, $90 while the owner lives in Unit A.
 */
async function enterDuplexWithWater(page: Page) {
  await page.goto('/deal-analyzer');
  await fillNumberField(page, 'Home price', '250000');
  await fillNumberField(page, 'Down payment', '25');
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Monthly rent', '1350');
  await page.keyboard.press('Tab');
  await fillNumberField(page, 'Vacancy rate', '0');
  await page.keyboard.press('Tab');
  const sheet = await openDealSheet(page);
  await sheet.getByTestId('add-unit').click();
  await type(
    page,
    sheet
      .getByRole('group', { name: 'Unit B' })
      .getByRole('textbox', { name: 'Rent', exact: true }),
    '1400',
  );
  await sheet.getByRole('button', { name: '+ Add expense' }).click();
  const row = sheet.getByTestId('custom-expense');
  await row.getByRole('textbox', { name: 'Expense name' }).fill('Water/Sewer');
  await type(page, row.getByRole('textbox', { name: 'Monthly amount' }), '180');
}

async function type(
  page: Page,
  input: ReturnType<Page['getByRole']>,
  value: string,
) {
  await input.click();
  await page.keyboard.press('ControlOrMeta+A');
  await input.pressSequentially(value);
  await page.keyboard.press('Tab');
}

const card = (page: Page) =>
  page.getByRole('region', { name: 'Rental Income vs. Operating Expenses' });
const money = async (page: Page, testId: string) =>
  Number(
    ((await card(page).getByTestId(testId).textContent()) ?? '').replace(
      /[^0-9.-]/g,
      '',
    ),
  );
const paidBy = (page: Page, option: 'Landlord' | 'Tenants (RUBS)') =>
  dealSheet(page)
    .getByTestId('custom-expense')
    .getByRole('radiogroup', { name: 'Paid by' })
    .getByRole('radio', { name: option })
    .click();

test.describe('Utility split / RUBS (spec 012 US4)', () => {
  test.beforeEach(async ({ page }) => {
    await skipSetupFor(page);
  });

  test('a new expense is landlord-paid: no reimbursement row', async ({
    page,
  }) => {
    await enterDuplexWithWater(page);
    await expect(
      dealSheet(page)
        .getByRole('radiogroup', { name: 'Paid by' })
        .getByRole('radio', { name: 'Landlord' }),
    ).toBeChecked();
    await closeDealSheet(page);
    await expect(card(page).getByTestId('row-rubs')).toHaveCount(0);
  });

  test('RUBS at 100% brings back $180 and raises NOI by $180', async ({
    page,
  }) => {
    await enterDuplexWithWater(page);
    await closeDealSheet(page);
    const landlordNoi = await money(page, 'row-noi');

    await openDealSheet(page);
    await paidBy(page, 'Tenants (RUBS)');
    await closeDealSheet(page);
    await expect(card(page).getByTestId('row-rubs')).toContainText(
      'Utility reimbursements (RUBS)',
    );
    await expect(card(page).getByTestId('row-rubs')).toContainText('$180.00');
    await expect
      .poll(async () => (await money(page, 'row-noi')) - landlordNoi)
      .toBeCloseTo(180, 2);
  });

  test('living in Unit A, only Unit B’s half comes back: $90', async ({
    page,
  }) => {
    await enterDuplexWithWater(page);
    await paidBy(page, 'Tenants (RUBS)');
    await dealSheet(page)
      .getByRole('group', { name: 'Unit A' })
      .getByRole('checkbox', { name: 'I live here' })
      .check();
    await closeDealSheet(page);
    await expect(card(page).getByTestId('row-rubs')).toContainText('$90.00');
  });

  test('a 50% recovery rate brings back $90 with both units rented', async ({
    page,
  }) => {
    await enterDuplexWithWater(page);
    await paidBy(page, 'Tenants (RUBS)');
    await type(
      page,
      dealSheet(page)
        .getByTestId('custom-expense')
        .getByRole('textbox', { name: 'Recovered' }),
      '50',
    );
    await closeDealSheet(page);
    await expect(card(page).getByTestId('row-rubs')).toContainText('$90.00');
  });
});
