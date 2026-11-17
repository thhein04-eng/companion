import { expect, test } from '@playwright/test';

// quickstart.md Scenario 6: export / print (User Story 1 / P1, FR-011).
test('downloads the schedule as a CSV with one row per period', async ({ page }) => {
  await page.goto('/amortization');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^amortization-schedule-.*\.csv$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const csv = Buffer.concat(chunks).toString('utf-8');
  const lines = csv.trim().split('\n');

  expect(lines[0]).toBe('Payment #,Date,Payment,Principal,Interest,Remaining Balance');
  expect(lines).toHaveLength(361); // header + 360 periods for the default scenario
});
