import { expect, test, type Page } from '@playwright/test';
import {
  clearNumberField,
  fillNumberField,
  openDealSheet,
  skipSetupFor,
} from './helpers';

/**
 * Spec 014 BRRRR reference deal: $200,000 price, 20% down ($40,000), $160,000 loan at 7% / 30 yr,
 * rent $2,800, tax $2,400, insurance $1,200. Refinance at month 12: ARV $320,000, LTV 75%,
 * 6.5% / 30 yr, closing costs $5,000.
 */
async function enterDeal(page: Page) {
  await page.goto('/refinance');
  await fillNumberField(page, 'Home price', '200000');
  await fillNumberField(page, 'Down payment', '20');
  await fillNumberField(page, 'Annual interest rate', '7');
  await fillNumberField(page, 'Annual property tax', '2400');
  await fillNumberField(page, "Annual homeowner's insurance", '1200');
  await fillNumberField(page, 'Monthly rent', '2800');
}

async function enterRefinance(page: Page, arv = '320000') {
  await fillNumberField(page, 'After-repair value (ARV)', arv);
  await fillNumberField(page, 'New interest rate', '6.5');
  await fillNumberField(page, 'Refinance closing costs', '5000');
  await page.keyboard.press('Tab');
}

/**
 * Types into one of this page's own fields. `fillNumberField` would send "Rehab budget" through
 * the Edit deal sheet (it is a shared deal field), but on this page it is an on-page input.
 */
async function fillOnPage(page: Page, name: string, value: string) {
  const input = page.getByRole('textbox', { name, exact: true });
  await input.click();
  await page.keyboard.press('ControlOrMeta+A');
  await input.pressSequentially(value);
}

async function enterCashInvested(page: Page) {
  await fillOnPage(page, 'Rehab budget', '50000');
  await fillOnPage(page, 'Purchase closing costs', '6000');
  await page.keyboard.press('Tab');
}

const cell = (page: Page, id: string) => page.getByTestId(id).locator('td');

test.beforeEach(async ({ page }) => {
  await skipSetupFor(page);
});

test.describe('Refinance & BRRRR Modeling (spec 014 US1)', () => {
  test('1: has its own route, title, heading and nav link', async ({
    page,
  }) => {
    await page.goto('/amortization');
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Refinance' })
      .click();
    await expect(page).toHaveURL(/\/refinance$/);
    await expect(page).toHaveTitle('Refinance & BRRRR Modeling · Companion');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Refinance & BRRRR Modeling',
      }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('navigation', { name: 'Primary' })
        .getByRole('link', { name: 'Refinance' }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('region', { name: 'Deal' })).toBeVisible();
  });

  test('2: reproduces the BRRRR reference proceeds', async ({ page }) => {
    await enterDeal(page);
    await enterRefinance(page);
    await expect(cell(page, 'refi-new-loan')).toHaveText('$240,000.00');
    await expect(cell(page, 'refi-payoff')).toHaveText('−$158,374.70');
    await expect(cell(page, 'refi-closing')).toHaveText('−$5,000.00');
    await expect(cell(page, 'refi-net-proceeds')).toHaveText('$76,625.30');
    await expect(cell(page, 'refi-pi-current')).toHaveText('$1,064.48');
    await expect(cell(page, 'refi-pi-new')).toHaveText('$1,516.96');
  });

  test('3: prompts for an ARV until one is entered', async ({ page }) => {
    await enterDeal(page);
    await expect(page.getByTestId('refinance-na')).toContainText(
      'Enter an after-repair value to model a refinance.',
    );
    await expect(page.getByTestId('refi-net-proceeds')).toHaveCount(0);
  });

  test('4: labels a negative net as a cash-in refinance', async ({ page }) => {
    await enterDeal(page);
    await enterRefinance(page, '200000');
    await expect(page.getByTestId('refi-net-proceeds')).toContainText(
      'Cash-in refinance',
    );
    await expect(page.getByTestId('refi-net-proceeds')).toContainText(
      'You bring cash to close',
    );
    await expect(cell(page, 'refi-net-proceeds')).toHaveText('−$13,374.70');
  });

  test('5: clamps a refinance month above the term, with a note', async ({
    page,
  }) => {
    await enterDeal(page);
    await enterRefinance(page);
    await fillNumberField(
      page,
      'Refinance month (months after purchase)',
      '999',
    );
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('refinance-clamped')).toContainText(
      'Refinance moved to month 360',
    );
    await expect(cell(page, 'refi-payoff')).toHaveText('$0.00');
  });

  test('6: shows an inline error for an invalid LTV and does not crash', async ({
    page,
  }) => {
    await enterDeal(page);
    await enterRefinance(page);
    await fillNumberField(page, 'Refinance LTV', '96');
    await page.keyboard.press('Tab');
    await expect(
      page
        .getByTestId('refinance-inputs')
        .getByText('Loan-to-value must be between 1% and 95%.'),
    ).toBeVisible();
    await expect(page.getByTestId('refinance-na')).toContainText(
      'Fix the refinance inputs to see the result.',
    );
    await expect(page.getByTestId('refi-net-proceeds')).toHaveCount(0);
  });

  test('7: asks for the loan inputs when there is no loan', async ({
    page,
  }) => {
    await page.goto('/refinance');
    await clearNumberField(page, 'Loan amount');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('refinance-na')).toContainText(
      'Fix the loan inputs to see the result.',
    );
  });
});

test.describe('Refinance & BRRRR Modeling (spec 014 US2)', () => {
  test('8: reproduces the BRRRR scorecard', async ({ page }) => {
    await enterDeal(page);
    await enterCashInvested(page);
    await enterRefinance(page);
    await expect(cell(page, 'refi-invested')).toHaveText('$96,000.00');
    await expect(cell(page, 'refi-cash-left')).toHaveText('$19,374.70');
    await expect(cell(page, 'refi-recycled')).toHaveText('79.82%');
    await expect(cell(page, 'refi-coc-before')).toHaveText('9.89%');
    await expect(cell(page, 'refi-coc-after')).toHaveText('21.00%');
  });

  test('9: rehab and purchase closing costs entered here count on /deal-analyzer too', async ({
    page,
  }) => {
    await enterDeal(page);
    await enterCashInvested(page);
    await page.goto('/deal-analyzer');
    await expect(
      (await openDealSheet(page)).getByTestId('total-cash-invested'),
    ).toContainText('$96,000.00');
  });

  test('10: shows "All cash recovered" and the surplus when the ARV covers everything', async ({
    page,
  }) => {
    await enterDeal(page);
    await enterCashInvested(page);
    await enterRefinance(page, '400000');
    await expect(cell(page, 'refi-net-proceeds')).toHaveText('$136,625.30');
    await expect(cell(page, 'refi-cash-left')).toHaveText('−$40,625.30');
    await expect(cell(page, 'refi-coc-after')).toHaveText('All cash recovered');
    await expect(page.getByTestId('refi-coc-after')).toContainText(
      'Cash surplus $40,625.30',
    );
  });

  test('11: without rent, cash-on-cash is N/A and the rehab inputs give way to a hint', async ({
    page,
  }) => {
    await page.goto('/refinance');
    await fillNumberField(page, 'Home price', '200000');
    await fillNumberField(page, 'Down payment', '20');
    await fillNumberField(page, 'Annual interest rate', '7');
    // ARV $250,000: net proceeds $24,125.30 leave $15,874.70 of the $40,000 down payment in the deal.
    await enterRefinance(page, '250000');
    await expect(page.getByTestId('refinance-no-rental')).toContainText(
      'Add rent to include rehab and closing costs in cash invested.',
    );
    await expect(
      page.getByRole('textbox', { name: 'Rehab budget', exact: true }),
    ).toHaveCount(0);
    await expect(cell(page, 'refi-invested')).toHaveText('$40,000.00');
    await expect(cell(page, 'refi-cash-left')).toHaveText('$15,874.70');
    await expect(cell(page, 'refi-coc-before')).toHaveText('N/A');
    await expect(page.getByTestId('refi-coc-before')).toContainText(
      'Add rent to see cash-on-cash',
    );
    await expect(cell(page, 'refi-coc-after')).toHaveText('N/A');
  });
});

/**
 * Spec 014 rate-drop reference: the $400,000 / 25% down / 7% / 30-year loan ($300,000, P&I
 * $1,995.91), refinanced at month 60 into 5.5% with $4,500 closing costs.
 */
async function enterRateDrop(page: Page) {
  await page.goto('/refinance');
  await fillNumberField(page, 'Home price', '400000');
  await fillNumberField(page, 'Down payment', '25');
  await fillNumberField(page, 'Annual interest rate', '7');
  await page.getByRole('radio', { name: 'Rate drop' }).click();
  await fillOnPage(page, 'New interest rate', '5.5');
  await fillOnPage(page, 'Refinance closing costs', '4500');
  await fillOnPage(page, 'Refinance month (months after purchase)', '60');
  await page.keyboard.press('Tab');
}

test.describe('Refinance & BRRRR Modeling (spec 014 US3)', () => {
  test('12: reproduces the rate-drop reference comparison', async ({
    page,
  }) => {
    await enterRateDrop(page);
    await expect(cell(page, 'refi-pi-current')).toHaveText('$1,995.91');
    await expect(cell(page, 'refi-pi-new')).toHaveText('$1,734.15');
    await expect(cell(page, 'refi-savings')).toHaveText('$261.76');
    await expect(cell(page, 'refi-breakeven')).toHaveText('Month 18');
    await expect(page.getByTestId('refi-breakeven')).toContainText(
      '1 yr 6 mo · loan month 78',
    );
    await expect(cell(page, 'refi-net-savings')).toHaveText('$74,028.00');
    await expect(page.getByTestId('refi-extended-note')).toHaveCount(0);
  });

  test('13: a fresh 30-year term shortens the breakeven and warns about the longer term', async ({
    page,
  }) => {
    await enterRateDrop(page);
    await fillOnPage(page, 'New loan term', '30');
    await page.keyboard.press('Tab');
    await expect(cell(page, 'refi-pi-new')).toHaveText('$1,603.41');
    await expect(cell(page, 'refi-breakeven')).toHaveText('Month 12');
    await expect(cell(page, 'refi-net-savings')).toHaveText('$29,307.13');
    await expect(page.getByTestId('refi-extended-note')).toContainText(
      'Part of this saving comes from the longer term.',
    );
  });

  test('14: shows "Immediate" for $0 costs and "No breakeven" when the rate rises', async ({
    page,
  }) => {
    await enterRateDrop(page);
    await fillOnPage(page, 'Refinance closing costs', '0');
    await page.keyboard.press('Tab');
    await expect(cell(page, 'refi-breakeven')).toHaveText('Immediate');
    await fillOnPage(page, 'Refinance closing costs', '4500');
    await fillOnPage(page, 'New interest rate', '7.5');
    await page.keyboard.press('Tab');
    await expect(cell(page, 'refi-breakeven')).toHaveText('No breakeven');
    await expect(page.getByTestId('refi-breakeven')).toContainText(
      'The new payment is not lower than your current payment',
    );
    await expect(page.getByTestId('refi-savings')).toContainText(
      'The new payment is higher than your current payment',
    );
  });

  test('15: switching back to Cash-out keeps the shared inputs', async ({
    page,
  }) => {
    await enterRateDrop(page);
    await page.getByRole('radio', { name: 'Cash-out (BRRRR)' }).click();
    await expect(
      page.getByRole('textbox', {
        name: 'After-repair value (ARV)',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'New interest rate', exact: true }),
    ).toHaveValue('5.5');
    await expect(
      page.getByRole('textbox', {
        name: 'Refinance closing costs',
        exact: true,
      }),
    ).toHaveValue('$4,500.00');
    await expect(
      page.getByRole('textbox', {
        name: 'Refinance month (months after purchase)',
        exact: true,
      }),
    ).toHaveValue('60');
  });

  test('16: the mode toggle and inputs work from the keyboard (FR-017)', async ({
    page,
  }) => {
    await page.goto('/refinance');
    const cashOut = page.getByRole('radio', { name: 'Cash-out (BRRRR)' });
    const rateDrop = page.getByRole('radio', { name: 'Rate drop' });
    await cashOut.focus();
    await expect(cashOut).toBeChecked();
    await page.keyboard.press('ArrowRight');
    await expect(rateDrop).toBeChecked();
    await expect(
      page.getByRole('textbox', {
        name: 'After-repair value (ARV)',
        exact: true,
      }),
    ).toHaveCount(0);

    // The toggle is one tab stop: Tab leaves it for the next field, and Enter commits a typed value.
    await page.keyboard.press('Tab');
    const rate = page.getByRole('textbox', {
      name: 'New interest rate',
      exact: true,
    });
    await rate.focus();
    await page.keyboard.type('5.5');
    await page.keyboard.press('Enter');
    await expect(rate).toHaveValue('5.5');
  });
});

test.describe('Refinance & BRRRR Modeling (spec 014 US4)', () => {
  const arv = (page: Page) =>
    page.getByRole('textbox', {
      name: 'After-repair value (ARV)',
      exact: true,
    });
  const addScenario = (page: Page) =>
    page.getByRole('button', { name: 'Add scenario', exact: true }).click();
  const tab = (page: Page, name: string) =>
    page.getByRole('region', { name: 'Deal' }).getByRole('tab', { name });

  test('17: each scenario keeps its own refinance inputs and mode', async ({
    page,
  }) => {
    await enterDeal(page);
    await enterRefinance(page);
    await expect(cell(page, 'refi-new-loan')).toHaveText('$240,000.00');

    // A new scenario starts as a copy; its edits do not touch the first.
    await addScenario(page);
    await fillOnPage(page, 'After-repair value (ARV)', '250000');
    await page.keyboard.press('Tab');
    await page.getByRole('radio', { name: 'Rate drop' }).click();
    await expect(page.getByRole('radio', { name: 'Rate drop' })).toBeChecked();

    await tab(page, 'Scenario 1').click();
    await expect(
      page.getByRole('radio', { name: 'Cash-out (BRRRR)' }),
    ).toBeChecked();
    await expect(arv(page)).toHaveValue('$320,000.00');
    await expect(cell(page, 'refi-new-loan')).toHaveText('$240,000.00');

    await tab(page, 'Scenario 2').click();
    await expect(page.getByRole('radio', { name: 'Rate drop' })).toBeChecked();
    await page.getByRole('radio', { name: 'Cash-out (BRRRR)' }).click();
    await expect(arv(page)).toHaveValue('$250,000.00');
    await expect(cell(page, 'refi-new-loan')).toHaveText('$187,500.00');
  });

  test('18: a reload in the same session restores the inputs and the mode', async ({
    page,
  }) => {
    await enterDeal(page);
    await enterRefinance(page);
    await page.getByRole('radio', { name: 'Rate drop' }).click();
    await page.reload();
    await expect(page.getByRole('radio', { name: 'Rate drop' })).toBeChecked();
    await page.getByRole('radio', { name: 'Cash-out (BRRRR)' }).click();
    await expect(arv(page)).toHaveValue('$320,000.00');
    await expect(
      page.getByRole('textbox', { name: 'New interest rate', exact: true }),
    ).toHaveValue('6.5');
    await expect(cell(page, 'refi-net-proceeds')).toHaveText('$76,625.30');
  });

  test('19: changing a shared input in the Deal Strip recomputes and keeps the refinance inputs', async ({
    page,
  }) => {
    await enterDeal(page);
    await enterRefinance(page);
    await expect(cell(page, 'refi-payoff')).toHaveText('−$158,374.70');
    await fillNumberField(page, 'Home price', '250000');
    await expect(cell(page, 'refi-payoff')).not.toHaveText('−$158,374.70');
    await expect(arv(page)).toHaveValue('$320,000.00');
    await expect(cell(page, 'refi-new-loan')).toHaveText('$240,000.00');
  });

  test('20: the change toast offers Undo for a refinance edit', async ({
    page,
  }) => {
    await enterDeal(page);
    await fillOnPage(page, 'After-repair value (ARV)', '320000');
    await page.keyboard.press('Tab');
    // The text is also in a screen-reader announcer, so target the toast's own title.
    await expect(
      page.locator('[data-slot="toast-title"]', {
        hasText: 'Refinance inputs changed',
      }),
    ).toBeVisible();
    await expect(arv(page)).toHaveValue('$320,000.00');

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(arv(page)).toHaveValue('');
    await expect(page.getByTestId('refinance-na')).toContainText(
      'Enter an after-repair value to model a refinance.',
    );
    // Undo reverts only the refinance edit: the deal in the strip is unchanged.
    await expect(
      page.getByRole('region', { name: 'Deal' }).getByText('$200,000').first(),
    ).toBeVisible();
  });

  test('21: a session saved before this feature loads with the defaults and no error', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('amortization:scenarios')) return;
      sessionStorage.setItem(
        'amortization:scenarios',
        JSON.stringify({
          activeScenarioId: 'old',
          scenarios: [
            {
              id: 'old',
              name: 'Old scenario',
              principal: 160_000,
              annualInterestRatePct: 7,
              termMonths: 360,
              startDate: '2027-01-01',
              paymentFrequency: 'monthly',
              homePrice: 200_000,
              downPayment: { percent: 20 },
              annualPropertyTax: null,
              annualInsurance: null,
              pmiAnnualRatePct: null,
              monthlyHoa: null,
              extraPayments: [],
              principalIsOverridden: false,
            },
          ],
        }),
      );
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/refinance');
    await expect(tab(page, 'Old scenario')).toBeVisible();
    await expect(
      page.getByRole('radio', { name: 'Cash-out (BRRRR)' }),
    ).toBeChecked();
    await expect(
      page.getByRole('textbox', { name: 'Refinance LTV', exact: true }),
    ).toHaveValue('75');
    await expect(
      page.getByRole('textbox', {
        name: 'Refinance month (months after purchase)',
        exact: true,
      }),
    ).toHaveValue('12');
    await expect(page.getByTestId('refinance-na')).toContainText(
      'Enter an after-repair value to model a refinance.',
    );
    expect(errors).toEqual([]);
  });
});

test.describe('Refinance & BRRRR Modeling (spec 014 SC-006)', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('22: has no horizontal scroll at 375 px in either mode', async ({
    page,
  }) => {
    await enterDeal(page);
    await enterCashInvested(page);
    await enterRefinance(page);
    const scrollWidth = () =>
      page.evaluate(() => document.documentElement.scrollWidth);
    await expect(cell(page, 'refi-cash-left')).toBeVisible();
    expect(await scrollWidth()).toBeLessThanOrEqual(375);

    await page.getByRole('radio', { name: 'Rate drop' }).click();
    await expect(page.getByTestId('refi-breakeven')).toBeVisible();
    expect(await scrollWidth()).toBeLessThanOrEqual(375);
  });
});
