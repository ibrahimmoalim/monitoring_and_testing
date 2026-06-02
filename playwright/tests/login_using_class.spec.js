import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.js'


test('SonarQube Login Test', async ({ page }) => {

    const username = process.env.TEST_USERNAME;
    const password = process.env.TEST_PASSWORD;
    const targetURL = process.env.BASE_URL;

    // Fail early if env vars are missing before doing any UI work
    if (!targetURL || !username || !password) {
        throw new Error('Missing environment variables!')
    };

    const loginPage = new LoginPage(page)

    loginPage.gotoLoginPage(targetURL);
    // wrap only the typing actions in a generic step to organize report
    await test.step('Entering credentials and submitting form', async () => {
        await loginPage.fillUsername(username)
        await loginPage.fillPassword(password)
    });
    loginPage.clickLogin();


    // Assertions

    // await expect(page).toHaveTitle('Projects - SonarQube Community Build');
    // use regular expression to look for only one word in the title
    await expect(page).toHaveTitle(/.*Projects/);

    await page.getByRole('link', { name: 'wallet-api' }).first().click();
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

});