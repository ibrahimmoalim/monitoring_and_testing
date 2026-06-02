import { test, expect } from '@playwright/test';

test('Login Test', async ({ page }) => {

    const targetURL = process.env.BASE_URL;
    const username = process.env.TEST_USERNAME;
    const password = process.env.TEST_PASSWORD;

    // fail the test if missing env vars
    if (!targetURL || !username || !password) {
        throw new Error('Missing environment variables!');
    }

    await page.goto(targetURL);

    // pause the test when run in '--headed' mode to see
    // what it does step by step
    // await page.pause();

    // wrap only the typing actions in it's own step to keep the report organized
    await test.step('Entering credentials and submitting form', async () => {
        await page.getByRole('textbox', { name: 'Username' }).fill(username);
        await page.getByRole('textbox', { name: 'Password' }).fill(password);
    })
    await page.getByRole('button', { name: 'Log in' }).click();

    // await expect(page).toHaveTitle('Projects - SonarQube Community Build');
    // use regular expression to look for only one word in the title
    await expect(page).toHaveTitle(/.*Projects/);

    await page.getByRole('link', { name: 'wallet-api' }).first().click();
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
});