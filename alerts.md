### Create the Alerts File in Your Directory

Create a new file named `node_alerts.yml` right inside the `~/monitoring` folder.

```yaml
groups:
  - name: node_exporter_alerts
    rules:
      # Alert if a server goes completely offline
      - alert: InstanceDown
        expr: up{job="node"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Instance {{ $labels.instance }} is down"
          description: "The Node Exporter target has been offline for more than 1 minute."

      # Alert if CPU usage is sustained above 90%
      - alert: HighCpuLoad
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU load on {{ $labels.instance }}"
          description: "CPU usage is at {{ printf \"%.2f\" $value }}% for the last 5 minutes."

      # Alert if Low Memory (Less than 10% remaining)
      - alert: LowMemory
        expr: (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 < 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Low Memory on {{ $labels.instance }}"
          description: "Available memory has dropped below 10% (Current: {{ printf \"%.2f\" $value }}%)."

```

---

### Step 2: Map the File in the `docker-compose.yml`

Open the `docker-compose.yml` file, go to the `prometheus` service, and add the new file mapping right under the existing `prometheus.yml` volume string:

```yaml
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./node_alerts.yml:/etc/prometheus/node_alerts.yml  # <--- ADD THIS LINE
      - prometheus_data:/prometheus

```

---

### Step 3: Tell Prometheus to Read the Alerts File

Open the `prometheus.yml` file, and add the `rule_files` block right above the `scrape_configs` block:

```yaml
global:
  scrape_interval: 15s

# Tell Prometheus to read the alerts file inside its internal directory
rule_files:
  - "/etc/prometheus/node_alerts.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
  # ... rest of the jobs remain exactly the same

```

---

### Step 4: Boot It Back Up!

Since you altered the Docker Compose configuration, you need to tell Docker to recreate the container and pick up the new volume mapping. Run this in the terminal:

```bash
docker compose up -d --force-recreate prometheus

```

Once it completes, open the browser to `http://localhost:9090/alerts`, and you will see the three brand-new alerting rules sitting there completely active, initialized, and evaluating the system metrics!