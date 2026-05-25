### The `docker-compose.yml` Updates

Add the **Blackbox Exporter** block right under the `tempo` service inside the `docker-compose.yml` file:

```yaml
  # Blackbox Exporter: Turns Prometheus into an external HTTP prober
  blackbox-exporter:
    image: prom/blackbox-exporter:latest
    container_name: blackbox-exporter
    restart: unless-stopped
    ports:
      - "127.0.0.1:9115:9115"
    volumes:
      - ./blackbox.yml:/etc/blackbox_exporter/config.yml
    networks:
      - monitoring-network

```

---

### The Configuration Files (`blackbox.yml` & `prometheus.yml`)

#### Create `blackbox.yml`

Create a new file called `blackbox.yml` in the `~/monitoring` directory to tell the exporter what a successful HTTP ping looks like:

```yaml
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_status_codes: []  # Defaults to 2xx status codes
      method: GET
      follow_redirects: true

```

#### Update `prometheus.yml`

Open the existing `prometheus.yml` file and append this new target profile inside the `scrape_configs:` array. This instructs Prometheus to route traffic through the exporter to test the local SonarQube instance:

```yaml
scrape_configs:
  # ... keep all the existing scrape jobs here (node-exporter, cadvisor, etc) ...

  - job_name: 'blackbox-http'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
        # Pings the SonarQube web portal port on the machine
        # You can add more targets
        - http://sonarqube:9000
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

```

---

### The k6 Browser Login Test (`sonarqube-login.js`)

#### Where to put it:

Create a dedicated automation folder to organize the scripts inside the project tree:

```bash
mkdir -p scripts
touch scripts/sonarqube-login.js

```

#### The Test Code:

Paste this script into `scripts/sonarqube-login.js`. It utilizes the native `k6/browser` API to open a headless instance of Chromium, enter credentials, and log into the local SonarQube container.

```javascript
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
    // 1. Route to the local SonarQube login interface
    await page.goto('http://localhost:9000/sessions/new');
    await page.waitForLoadState('networkidle');

    // 2. Select input elements and fill out credentials
    // (Replace 'admin' with the actual local SonarQube setup if changed)
    await page.locator('input[name="login"]').type('admin');
    await page.locator('input[name="password"]').type('admin');

    // 3. Click the log in submission button
    const loginButton = page.locator('button[type="submit"]');
    await Promise.all([
      page.waitForNavigation(),
      loginButton.click(),
    ]);

    // 4. Assert login success by locating an element on the inner landing dashboard
    // SonarQube defaults to showing a global projects title header
    const postLoginHeader = await page.locator('h1').textContent();

    check(postLoginHeader, {
      'Successfully authenticated and reached Dashboard': (text) => text.includes('Projects'),
    });

  } finally {
    await page.close();
  }
}

```

#### How to execute the script:

Run this directly from the host machine's terminal. By appending the `--out` argument, k6 will send frontend page layout timings directly into the running containerized Prometheus:

```bash
k6 run --out experimental-prometheus-rw=http://localhost:9090/api/v1/write scripts/sonarqube-login.js

```

---

### Grafana Dashboard Import Reference IDs

Log into Grafana (`http://localhost:3001`), choose **Dashboards > New > Import**, and fetch data streams using these production-ready IDs:

* **`14928` (Prometheus Blackbox Exporter HTTP Prober):** This completely maps the HTTP ping configurations. It visualizes global web availability percentages, response latency phases, and SSL countdown tracking down to the day.
* **`19623` (k6 Browser Performance Overview):** This maps the manual `k6` frontend browser scripts. It populates dashboards focused on Web Vitals metrics, page rendering behaviors, and click-to-load interaction timeframes.