import { browser } from 'k6/browser';
import { check } from 'k6';

export const options = {
    scenarios: {
        ui: {
            executor: 'shared-iterations',
            options: {
                browser: {
                    type: 'chromium',
                },
            },
        },
    },
};

export default async function sonarqubeLoginTest() {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Route to the local SonarQube login interface
        await page.goto('http://localhost:9000/sessions/new');
        await page.waitForLoadState('networkidle');

        // Select input elements and fill out credentials
        // (Replace 'username' and 'password' with the actual local SonarQube
        // login username and password)
        await page.locator('input[name="login"]').type('username');
        await page.locator('input[name="password"]').type('password');

        // Click the log in submission button
        const loginButton = page.locator('button[type="submit"]');
        await Promise.all([
            page.waitForNavigation(),
            loginButton.click(),
        ]);

        // Assert login success by locating an element on the inner landing dashboard
        // SonarQube defaults to showing a global projects title header
        const postLoginHeader = await page.locator('h1').textContent();

        check(postLoginHeader, {
            'Successfully authenticated and reached Dashboard': (text) => text.includes('Projects'),
        });

    } finally {
        await page.close();
    }
}