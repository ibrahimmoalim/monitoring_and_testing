Using the monitoring/ dir which has Docker Compose setup with Grafana, Prometheus, Node Exporter, and cAdvisor, we can add Loki (for logs) and Tempo (for traces)

To make this work, you will need to add four new pieces to your `docker-compose.yml`:

1. **Loki:** The log storage engine.
2. **Promtail:** The log shipper (it reads your Docker logs and sends them to Loki).
3. **Tempo:** The trace storage engine.
What is a Trace? (Why do you need Tempo?)

In modern software, a single user action (like clicking "Buy Now" on a banking app) doesn't just hit one server. It triggers a chain reaction across dozens of microservices: the Frontend talks to the Authentication service, which talks to the Payment gateway, which updates the Database, and notifies the Shipping service.

If that "Buy Now" button takes 5 seconds to load, how do you know which specific service caused the delay?

- A Trace is the map of that entire journey.

- Tempo is the storage vault that collects, saves, and lets you visualize that map. It breaks down the total 5 seconds into "spans," showing you exactly how many milliseconds each individual microservice took to do its job.
4. **An Application/Instrumented App:** To actually generate traces to send to Tempo (since Node Exporter and cAdvisor only generate metrics).

Here is how to update your setup.

---

### Step 1: Create the Configuration Files

Before updating your Docker Compose file, you need to create basic configuration files for Promtail and Tempo so they know how to behave. Create these in the same directory as your `docker-compose.yml`.

**`promtail-config.yml`** (Tells Promtail to scrape your Docker container logs and send them to Loki)

Check [here](https://github.com/ibrahimmoalim/prometheus_and_grafana/blob/main/promtail-confing.yml)

**`tempo-config.yml`** (A basic single-binary configuration for Tempo)

Check [here](https://github.com/ibrahimmoalim/prometheus_and_grafana/blob/main/tempo-config.yml)

---

### Step 2: Update your `docker-compose.yml`

Append these services to your existing Docker Compose file. They will automatically join your existing network so Grafana can talk to them.

Already added [here](https://github.com/ibrahimmoalim/prometheus_and_grafana/blob/main/docker-compose.yml)

Run `docker compose up -d` to pull the images and spin up the new services.

---

### Step 3: Connect Loki and Tempo in Grafana

Now that the containers are running, you need to tell Grafana where to find them.

1. Open your Grafana dashboard (`http://localhost:3000`).
2. Navigate to **Connections** -> **Data Sources** -> **Add data source**.

#### To Add Loki:

1. Search for **Loki** and select it.
2. In the **Connection** URL field, enter: `http://loki:3100` (since they are on the same Docker network).
3. Link Trace-to-Log: Scroll down to the Derived Fields or Trace to logs setting. Configure it to map your log's traceId so you can jump from a trace panel straight back to Loki logs:
    - **Name**: `TraceID`
    - **Type**: `Regex in log line`
    - **Regex**: `traceId=(\w+)`
    - **Query**: `${__value.raw}` (Leave this exactly as text; do not put an http link here!)
    - **URL Label**: `View Trace 🔍`
    - **Internal link**: **ON**
    - **Select data source**: Choose **Tempo** from the dropdown menu.
4. Scroll to the bottom and click **Save & Test**. You should see a green success checkmark.

#### To Add Tempo:

1. Go to Connections -> Data sources -> Add data source.
2. Select Tempo.
3. Set the URL to: http://tempo:3200
4. Scroll down to the **Trace to logs** section. This is the "magic link" that lets you jump from a trace to a log.
* Set the Data source to **Loki**.
* Set the Tags to `container` (matching the label created in Promtail).
5. Click **Save & Test**.

---

### Step 4: How to see data

* **For Logs (Loki):** Go to the **Explore** tab in Grafana, change the data source at the top left to **Loki**, click **Label browser**, select `container`, pick one of your containers (like `prometheus`), and click **Run query**. You will see your live container logs streaming in.
* **For Traces (Tempo):** To see traces, your applications themselves need to be written to send trace data (using a library like OpenTelemetry) to `http://localhost:4317` (gRPC) or `http://localhost:4318` (HTTP). Node Exporter and cAdvisor do not inherently produce tracing data, so you won't see traces until you connect an instrumented application (like a Node.js, Go, or Python microservice).
