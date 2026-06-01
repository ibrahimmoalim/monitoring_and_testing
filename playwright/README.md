## What is Playwright?

- Free and open source framework for web automation testing, created by Microsoft
- Apps it can test -> Web browser apps, Mobile web apps, and APIs
- Languages -> JavaScript, TypeScript, Java, Python, and .NET (C#)
- Browsers -> all modern engines like Chromium (google chrome, brave etc), WebKit, and Firefox. You can use these browsers in a headless (no GUI, it's the default and very fast becuase all tests run in the background) or headed (You can watch Playwright move the mouse, type text into inputs, click buttons, and navigate through pages in real-time.) mode.
- OS support -> Linux, windows, macos.
- Built-in reportes or custom reporters
- CI/CD and Docker support
- Website -> https://playwright.dev/
- Github -> https://github.com/microsoft/playwright

## What we can do with Playwright?

- Functional testing
- API testing
- Accessibility testing (with 3rd party plugin)
- Recording
- Debugging
- Explore selectors
- Parallel testing (makes testing even faster)
- Emulate mobile devices, geolocations

## Installation

- On this Playwright tests directory, run:
    ```bash
    npm init playwright@latest
    ```
    - Choose JavaScript
    - Name the e2e dir or just leave it default 'tests'
    - Add GitHub actions: true
    - Install browsers: true
    - Install OS dependencies: true

- Install `dotenv` package to inject `.env` variables
    ```bash
    npm install dotenv --save-dev
    ```
    > `--save-dev` since this is for testing only, the package will be listed under the "devDependencies" section rather than the standard "dependencies" section. It is never bundled into the final application.
    Make sure to add the config to load env vars on `playwright.config.js` file:
    ```JS
    import { defineConfig, devices } from '@playwright/test';

    // * Read environment variables from file.
    // * https://github.com/motdotla/dotenv
    import dotenv from 'dotenv';
    import path from 'node:path';
    dotenv.config({ path: path.resolve(__dirname, '.env') });

    /**
    * @see https://playwright.dev/docs/test-configuration
    */
    export default defineConfig({
    use: {
        // Captures a screenshot of test results only when a test fails (saves disk space on Staging CI)
        screenshot: 'only-on-failure',
        // Collect trace when retrying on a failed test
        trace: 'on-first-retry',
    },

    testDir: './tests',
    /* Run tests in files in parallel */
    // ... rest of code
    ```
    To use the `.env` vars in test code:
    ```JS
    // ... add the imports and test block initiation above
    const username = process.env.TEST_USERNAME;
    const password = process.env.TEST_PASSWORD;

    // Defensive check: Ensure the test fails early if variables are missing
    if (!username || !password) {
        throw new Error('CRITICAL: TEST_USERNAME or TEST_PASSWORD environment variables are not defined!');
    }

    // 3. Fill out the login form
    await page.locator('#username-input').fill(username);
    await page.locator('#password-input').fill(password);
    // ... rest of code
    ```
    On Linux staging server, you can use:
    ```bash
    export TEST_USERNAME="linux_staging_user"
    export TEST_PASSWORD="StagingPasswordXYZ"
    export BASE_URL="https://linux-staging.mycompany.com"

    npx playwright test
    ```

## Commands

- check playwright version
    ```bash
    npm playwright -v
    ```
- see all playwright commands
    ```bash
    npx playwright -h
    ```
    > `npx` is used to execute `npm` libraries on a local directory
- run parallel tests to save time
    ```bash
    npx playwright test --workers 6
    ```
    > 6 if running 6 tests
- run tests on a specific file
    > It detects tests/ by default.
    > You can just type one word thats in the test file name,
    > and playwright will detect and test it
    ```bash
    npx playwright test example
    ```
    or multiple files:
    ```bash
    npx playwright test file1 file2.spec.js
    ```
    > adding the .spec.js is not required
- run specific tests by their title in the code
    ```bash
    npx playwright test -g started
    ```
    > Playwright will look through the test files and only execute tests where the title contains the word "started".
    > '-g' stands for --grep, It is used to filter and run specific tests based on their title or description using a regular expression or text match.
- run test on a specific browser
    ```bash
    npx playwright test --project=firefox
    ```
    > will only test on firefox
- run in a `headed` mode
    ```bash
    npx playwright test --project=chromium --headed
    ```
    > this will pop-up a browser window and show playwright running tests on it
- run with debug
    ```bash
    npx playwright test --project=webkit --debug
    ```
    > this will run in `headed` mode by default because it wants to show more details, it will allow you to pause and forward making it easier to see how it does the test
- start test from a specific line in the test code (it must be the starting line of that specific test block test(...))
    ```bash
    npx playwright test :11 --project=firefox --debug
    ```
    > this goes straight into line 11 where the second test starts in the code and playwright starts testing from there, skipping the first test block completely
    You can test a specific file and start from a specific line (test block):
    ```bash
    npx playwright test example:11 --project=firefox --debug
    ```

### Codegen (Test Generator)

- see all the options/args for Codegen command
    ```bash
    npx playwright codegen --help
    ```
- record tests with Codegen
    ```bash
    npx playwright codegen
    ```
    > This will open 2 windows like when running tests with `--debug`, window 1 is the browser and window 2 is the playwright inspector which generates test code as you click through a specific website, you can then use that test code to run tests (it basically writes tests for you)
- run codegen with a specific URL (so it directly opens it)
    ```bash
    npx playwright codegen ibrahimmoalim.dev
    ```
- record on a specific browser
    > by default it uses chrome
    ```bash
    npx playwright codegen --browser firefox
    ```
- save the generated test code in a file
    ```bash
    npx playwright codegen -o tests/codegen_test.spec.js
    ```
    > '-o' meaning output, this will create a file named 'codegen_test.spec.js' in tests/ and save the generated test code in there using javascript as the language by default.
- record on a specific device
    ```bash
    npx playwright codegen ibrahimmoalim.dev --device="Galaxy S8" -o tests/codegen_test_mobile.spec.js
    ```
- emulate color scheme (only works if website supports theme change)
    ```bash
    npx playwright codegen api.ibrahimmoalim.dev --color-scheme=dark
    ```
    > opens the website in dark mode (default is light)

## Debug

- if missing dependencies error is shown after running tests
    ```bash
    sudo npx playwright install-deps
    ```
    Ensure browsers are also up-to-date alongside their dependencies
    ```bash
    npx playwright install --with-deps
    ```
