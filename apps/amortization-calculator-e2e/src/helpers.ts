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
  const input = page.getByRole('textbox', { name, exact: true });
  await input.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
}
