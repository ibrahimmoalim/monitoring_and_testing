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
    - Install OS dependencies: false (install if required later with: `sudo npx playwright install-deps`)
