// @ts-check
import { test, expect } from '@playwright/test';

test('shows title and heading', async ({ page }) => {
    await page.goto('https://ibrahimmoalim.dev/');

    // test title visibility on the tab
    await expect(page).toHaveTitle('ibrahimmoalim');

    // click on svg element to change theme
    // img role works for svg too
    await page.getByRole('img', { name: 'Change Theme' }).click();

    // Expect h1 name "to contain" a substring.
    await expect(page.getByRole('heading', { name: 'Ibrahim' })).toBeVisible();
});

test('projects link and API works', async ({ page, context }) => {
    await page.goto('https://ibrahimmoalim.dev/');

    // Click the Projects link.
    await page.getByRole('link', { name: 'Projects' }).click();

    // Click the 'Compliments API' link and catch the new tab
    // because 'Compliments API' link has target='_blank'.
    // This prevents the click() action from locking up the
    // execution thread. Which makes playwright never go to the next step.
    const [newTab] = await Promise.all([
        // context is given as parameter in the async line
        // async ({ page, context })
        context.waitForEvent('page'),
        page.getByRole('link', { name: 'Compliments API' }).click()
    ]);

    // wait for URL of the new page to load fully
    // use this 'newTab' for tests on the new pageinstead of 'page'
    await newTab.waitForURL('https://api.ibrahimmoalim.dev/');

    // define the locators
    // finds elements by id(#) or class(.)
    const complimentText = newTab.locator('#js-compliment');
    const complimentButton = newTab.locator('.js-btn');

    // get the initial text of paragraph before clicking
    const initialText = await complimentText.innerHTML();

    // Click the 'random compliment' link.
    await complimentButton.click();

    // Expects paragraph test to have changed from the initial one.
    await expect(complimentText).not.toHaveText(initialText);
});
