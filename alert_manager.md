Prometheus is only the evaluation engine; it doesn’t actually know how to send emails, talk to Slack, or make phone calls. For that, you need **Alertmanager**.

To connect this up, we are going to do three things:

1. Generate a secure Google App Password.
2. Spin up the Alertmanager service in the `docker-compose.yml`.
3. Configure `alertmanager.yml` to route alerts out through Gmail's SMTP servers.

---

### Step 1: Generate a Gmail App Password

Google blocks apps from logging into the account using the regular password. You must create an **App Password**.

1. Go to the Google Account Settings ([myaccount.google.com](https://myaccount.google.com)).
2. Go to **Security** on the left menu.
3. Under *How you sign in to Google*, make sure **2-Step Verification** is turned ON.
4. Search for and click on **App passwords**.
5. Give it a name (e.g., `Prometheus Alerts`) and click **Create**.
6. Google will show you a **16-character code** (like `abcd efgh ijkl mnop`). Copy this down without spaces—this is the SMTP password!

---

### Step 2: Add Alertmanager to `docker-compose.yml`

Open the `docker-compose.yml` file. We need to add the `alertmanager` service and let `prometheus` know it exists.

#### 1. Add this service block under the services section:

```yaml
  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    restart: unless-stopped
    ports:
      # only localhost can access alertmanager
      - "127.0.0.1:9093:9093"
    # Use the config for alertmanager inside this compose file
    # unlike the prometheus config which has it's own file
    # this allows us to use .env variables
    configs:
      - source: alertmanager_config
        target: /etc/alertmanager/alertmanager.yml
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
    networks:
      - monitoring-network

```

#### 2. Update the existing `prometheus` service block:

Tell the existing `prometheus` container to pass firing rules to Alertmanager over the docker network. Add these lines to the `prometheus` block:

```yaml
  prometheus:
    image: prom/prometheus:latest
    # ... the existing configs (container_name, volumes, etc.) remain the same ...
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle' # Added this so you can reload configs easily
    networks:
      - monitoring-network

```

---

### Step 3: Put alertmanager config in the compose file

Check the last block of the `docker-compose.yml` file

---

### Step 4: Update `prometheus.yml` to Route Alerts

Now open the existing `prometheus.yml` file. We need to tell Prometheus *where* Alertmanager lives on the network. Add the `alerting` block right under the `rule_files` block:

```yaml
global:
  scrape_interval: 15s

rule_files:
  - "/etc/prometheus/node_alerts.yml"

# ADD THIS BLOCK BELOW
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - 'alertmanager:9093' # Uses Docker's internal network DNS name

scrape_configs:
  # ... the existing scrape configs stay exactly the same ...

```

---

### Step 5: Start It Up and See It Live!

Run the compose up command to fetch and mount everything:

```bash
docker compose up -d

```

1. Open `http://localhost:9090/alerts` in the browser.
2. Open `http://localhost:9093` to see the Alertmanager control room UI.
3. To trigger a real email to the inbox right now, go back into the terminal and kill the Node Exporter container to force the `InstanceDown` alert to fire:
```bash
docker compose stop node-exporter

```

Within 1 to 2 minutes, the alert inside Prometheus will turn red (**FIRING**), pass the event to Alertmanager, and Alertmanager will use the Google App token to safely slide a notification email right into the Gmail inbox!