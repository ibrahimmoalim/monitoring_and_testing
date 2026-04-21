## prometheus_and_grafana installation via docker-compose

To get a functional monitoring stack running quickly, you’ll want to define **Prometheus** (the database), **Grafana** (the UI), and **Node Exporter** (the agent that pulls hardware metrics from your host).

### The `docker-compose.yml` File

Create a directory (e.g., `monitoring`), and make a `docker-compose.yml`.

Use `.env` for Grafana webUI user and pass:
Instead of typing your password directly in the docker-compose.yml, it is better practice to use an `.env` file:

Create a file named `.env` in your `~/monitoring` folder.

Add:

GRAFANA_USER=(username)
GRAFANA_PASS=(secure-password)

In docker-compose.yml, under section granfana-environment:
- GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_USER}
- GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASS}


---

### Critical Step: The Configuration File
Prometheus won't know what to look at unless you give it a config. In the **same folder**, create a file named `prometheus.yml`:

then run:
```bash
docker-compose up -d
 ```

---

### How to access your new stack
1.  **Prometheus UI:** Navigate to `http://localhost:9090`. Click "Status" -> "Targets" to ensure the `node` job is green.
2.  **Grafana UI:** Navigate to `http://localhost:3001`.
    * **User:** `admin` / **Password:** `admin`.
3.  **Connect them:** In Grafana, go to **Connections** -> **Data Sources** -> **Add Prometheus**.
    * For the URL, use `http://prometheus:9090` (Docker handles the DNS for you).
4.  **Instant Dashboard:** To see your server stats immediately, go to **Dashboards** -> **New** -> **Import** and type ID `1860` (the official Node Exporter Full dashboard).
