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

/*
If you get problems after running this test file with:

k6 run --out experimental-prometheus-rw=http://localhost:9090/api/v1/write sonarqube_login.js

Or:

K6_BROWSER_PATH=/usr/bin/chromium k6 run --out experimental-prometheus-rw=http://localhost:9090/api/v1/write sonarqube_login.js

like "ERRO[0000] GoError: unknown module: k6/browser..."

There's a problem with the keyrings for k6 and chromium binary is probably missing (k6/browser module uses the Chrome DevTools Protocol (CDP) to talk to the browser. Because CDP is a proprietary communication engine unique to Google, k6 is strictly hardcoded to only control Chromium-based browsers (such as Chromium, Google Chrome, Microsoft Edge, or Brave)), do this:

# Install chromium
sudo apt install -y chromium

# Erase the corrupted 32-byte keyring file
sudo rm -f /usr/share/keyrings/k6-archive-keyring.gpg

# Re-download and correctly "dearmor" (convert to binary format) the real Grafana key
curl -fsSL https://dl.k6.io/key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg

# Fix the permissions so apt can read it (644 permissions)
sudo chmod 644 /usr/share/keyrings/k6-archive-keyring.gpg

# Update the sources list
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list

# Run apt update to match keys and indexes
sudo apt update

# Pull down the full package build
sudo apt install -y k6

*/