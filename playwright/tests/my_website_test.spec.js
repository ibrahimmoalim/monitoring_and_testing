import { test, expect } from '@playwright/test';


// This is how to group tests that share a single page or something else
// the 'test.before..' and 'test.after..' blocks in this describe block will only
// work inside this describe block (Group).
// You can add more tests where this group block ends and even add more groups.
test.describe('my_website_tests', () => {

    // this test will run before each test
    // it's used to repetitive sections
    test.beforeEach(async ({ page }) => {
        await page.goto('https://ibrahimmoalim.dev/');
    })

    // this runs after every test and closes the page
    // this doesn't interact with .before or .after blocks
    // just regular test blocks
    test.afterEach(async ({ page }) => {
        await page.close()
    })

    test('shows title and heading', async ({ page }) => {

        // test title visibility on the tab
        await expect(page).toHaveTitle('ibrahimmoalim');

        // click on svg element to change theme
        // img role works for svg too
        await page.getByRole('img', { name: 'Change Theme' }).click();

        // Expect h1 name "to contain" a substring.
        await expect(page.getByRole('heading', { name: 'Ibrahim' })).toBeVisible();
    });

    test('projects link and API works', async ({ page, context }) => {

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

});
