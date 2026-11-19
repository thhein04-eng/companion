import type { Page } from '@playwright/test';

/**
 * Types into a `NumberField`'s text control. `locator.fill()` doesn't
 * reliably update this custom controlled input in WebKit, so this selects
 * any existing text and types the value as real keystrokes instead (the
 * first keystroke replaces the selection). A separate `Backspace` before
 * typing is deliberately avoided: clearing an already-populated,
 * currency-formatted field commits and reformats it to "$0.00" immediately,
 * so subsequent keystrokes append after that text instead of replacing it.
 */
export async function fillNumberField(page: Page, name: string, value: string) {
  if (SHARED_DEAL_FIELDS.has(name)) {
    await fillDealField(page, name, value);
    await closeDealSheet(page);
    return;
  }
  const input = page.getByRole('textbox', { name, exact: true });
  await input.click();
  await page.keyboard.press('ControlOrMeta+A');
  await input.pressSequentially(value);
}

/**
 * Empties a `NumberField` (value → null). `fillNumberField(page, name, '')`
 * does not work for this: an empty `pressSequentially` leaves the old value.
 */
export async function clearNumberField(page: Page, name: string) {
  if (SHARED_DEAL_FIELDS.has(name)) {
    await clearDealField(page, name);
    await closeDealSheet(page);
    return;
  }
  const input = page.getByRole('textbox', { name, exact: true });
  await input.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
}

/**
 * Labels of the shared deal inputs, which live only in the Edit deal sheet since spec 010.
 * `fillNumberField` / `clearNumberField` route these through the sheet automatically.
 */
export const SHARED_DEAL_FIELDS = new Set([
  'Home price',
  'Down payment',
  'Loan amount',
  'Annual interest rate',
  'Loan term',
  'Annual property tax',
  "Annual homeowner's insurance",
  'PMI rate',
  'Monthly HOA fee',
  'Monthly rent',
  'Other monthly income',
  'Vacancy rate',
  'Property management',
  'Maintenance reserve',
  'CapEx reserve',
  'Closing costs',
  'Rehab budget',
  'Monthly amount',
]);

/** A shared deal field's textbox inside the Edit deal sheet (opens the sheet). */
export async function dealField(page: Page, name: string) {
  const sheet = await openDealSheet(page);
  return sheet.getByRole('textbox', { name, exact: true });
}

/** The Deal Strip's "Edit deal" sheet (spec 010 US1). */
export function dealSheet(page: Page) {
  return page.getByRole('dialog', { name: /deal/i });
}

/** Opens the Edit deal sheet and waits for it. */
export async function openDealSheet(page: Page) {
  const sheet = dealSheet(page);
  if (await sheet.isVisible()) return sheet;
  await page.getByRole('button', { name: 'Edit deal', exact: true }).click();
  await sheet.waitFor({ state: 'visible' });
  return sheet;
}

/** Closes the Edit deal sheet with its Done button. */
export async function closeDealSheet(page: Page) {
  const sheet = dealSheet(page);
  if (!(await sheet.isVisible())) return;
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await sheet.waitFor({ state: 'hidden' });
}

/**
 * Types into a shared deal field inside the Edit deal sheet, opening it if needed. Leaves the
 * sheet open so several fields can be filled in a row; call `closeDealSheet` when done.
 */
export async function fillDealField(page: Page, label: string, value: string) {
  const sheet = await openDealSheet(page);
  const input = sheet.getByRole('textbox', { name: label, exact: true });
  await input.click();
  await page.keyboard.press('ControlOrMeta+A');
  await input.pressSequentially(value);
}

/** Empties a shared deal field inside the Edit deal sheet. */
export async function clearDealField(page: Page, label: string) {
  const sheet = await openDealSheet(page);
  const input = sheet.getByRole('textbox', { name: label, exact: true });
  await input.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
}

/** Opens a strip chip's popover, types a value into its field, then closes it with Escape. */
export async function editChip(
  page: Page,
  chipName: RegExp,
  fieldLabel: string,
  value: string,
) {
  await page
    .getByRole('region', { name: 'Deal' })
    .getByRole('button', { name: chipName })
    .click();
  const input = page
    .getByRole('dialog')
    .getByRole('textbox', { name: fieldLabel, exact: true });
  await input.click();
  await page.keyboard.press('ControlOrMeta+A');
  await input.pressSequentially(value);
  await page.keyboard.press('Escape');
}

/**
 * Marks first-run setup as done for every scenario this session before the page loads, so specs that
 * test other stories never trip the setup sheet (spec 010 US3).
 */
export async function skipSetupFor(page: Page) {
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem(
        'companion.setupDone',
        JSON.stringify(['*']),
      );
    } catch {
      /* storage unavailable */
    }
  });
}

/** Cycles the theme switcher until it reports the wanted theme. */
export async function setTheme(page: Page, theme: 'system' | 'light' | 'dark') {
  const label = `Theme: ${theme[0].toUpperCase()}${theme.slice(1)}`;
  for (let i = 0; i < 3; i++) {
    const button = page.getByRole('button', { name: /^Theme: / }).first();
    if ((await button.getAttribute('aria-label')) === label) return;
    await button.click();
  }
}
