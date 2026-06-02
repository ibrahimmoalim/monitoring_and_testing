import { test } from '@playwright/test';

test.use({
  colorScheme: 'dark'
});

test('test', async ({ page }) => {
  await page.goto('https://api.ibrahimmoalim.dev/');
  await page.getByText('random compliment', { exact: true }).click();
  await page.locator('#js-code-copy-message').click();
  await page.getByRole('img', { name: 'copy-icon' }).nth(3).click();
});