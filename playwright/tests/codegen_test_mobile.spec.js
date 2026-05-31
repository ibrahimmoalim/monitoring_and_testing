import { test, devices } from '@playwright/test';

test.use({
  ...devices['Galaxy S8'],
});

test('test', async ({ page }) => {
  await page.goto('https://ibrahimmoalim.dev/');
  await page.getByRole('img', { name: 'Change Theme' }).click();
  await page.getByRole('heading', { name: 'Ibrahim Mohamed Moalim' }).click();
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('img', { name: 'GitHub logo' }).click();
  const page1 = await page1Promise;
  await page1.goto('https://github.com/ibrahimmoalim');
  await page1.getByRole('link', { name: 'followers' }).click();
  await page1.goto('https://github.com/ibrahimmoalim');
  await page1.getByText('ibrahimmoalim').nth(2).click();
  await page1.getByRole('link', { name: 'Repositories' }).click();
  await page1.getByRole('link', { name: 'social-homepage' }).click();
  await page1.getByRole('link', { name: 'img, (Directory)' }).click();
  await page1.getByRole('link', { name: 'islam.jpg, (File)' }).click();
  await page1.getByRole('img', { name: 'islam.jpg' }).click();
  await page.getByText('Projects:').click();
  await page.getByText('Contact Me:').click();
});