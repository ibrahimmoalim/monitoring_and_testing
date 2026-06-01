import { test, expect, browserName } from '@playwright/test';

// 'test.skip' skips this whole test block
test.skip('skip this test', async ({ page }) => {
    await page.goto('https://api.ibrahimmoalim.dev/')
})

// 'test.fail()' inside a test block means expect a crash or fail but the
// overall test result will say passed because "it successfully failed it"
// use 'test.fail()' for minor bugs you want to fix later, but you want to
// deploy now and not fail the entire pipeline.
// Use 'throw new Error('error message') for critical things like DB connection failed
// 'throw new Error' actually fails the test and shows failure on
// test report with the error message you give it.
test('expected to fail', async ({ page }) => {
    // basic condition check for testing
    if (2 + 3 === 4) {
        await page.goto('https://api.ibrahimmoalim.dev/')
    } else {
        test.fail();
        throw new Error('2 + 3 does not equal 4');
    }
})

// skip test on specific browser and add a message
test('skip on webkit', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'webkit has issues that will be fixed later')
})

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
